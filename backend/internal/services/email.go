package services

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"os"
	"strings"
	"time"

	"filmhouse-backend/internal/models"

	"github.com/resend/resend-go/v2"
	"github.com/skip2/go-qrcode"
	"gorm.io/gorm"
)

type EmailService struct {
	db           *gorm.DB
	resendClient *resend.Client
	from         string
}

func NewEmailService(db *gorm.DB) *EmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	var client *resend.Client
	if apiKey != "" {
		client = resend.NewClient(apiKey)
	}

	return &EmailService{
		db:           db,
		resendClient: client,
		from:         getEnvOrDefault("EMAIL_FROM", "Filmhouse <tickets@filmhouse.sg>"),
	}
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

// SendTicketEmail sends booking confirmation with QR code ticket
func (s *EmailService) SendTicketEmail(booking *models.Booking) error {
	// Load full booking data if not loaded
	if booking.User == nil || booking.Screening == nil {
		s.db.Preload("Tickets.Seat").
			Preload("Screening.Film").
			Preload("Screening.Hall").
			Preload("User").
			First(booking, booking.ID)
	}

	// Generate QR code image
	qrPNG, err := qrcode.Encode(booking.QRCode, qrcode.Medium, 256)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Build seat list
	var seats []string
	for _, ticket := range booking.Tickets {
		if ticket.Seat != nil {
			seats = append(seats, fmt.Sprintf("%s%d", ticket.Seat.Row, ticket.Seat.Number))
		}
	}

	// Parse email template
	data := map[string]interface{}{
		"BookingRef":   booking.BookingRef,
		"CustomerName": fmt.Sprintf("%s %s", booking.User.FirstName, booking.User.LastName),
		"FilmTitle":    booking.Screening.Film.Title,
		"FilmYear":     booking.Screening.Film.Year,
		"FilmRating":   booking.Screening.Film.Rating,
		"FilmDuration": booking.Screening.Film.Duration,
		"HallName":     booking.Screening.Hall.Name,
		"ShowDate":     booking.Screening.StartTime.Format("Monday, 2 January 2006"),
		"ShowTime":     booking.Screening.StartTime.Format("3:04 PM"),
		"Seats":        strings.Join(seats, ", "),
		"TotalAmount":  fmt.Sprintf("$%.2f", booking.FinalAmount),
		"PointsEarned": booking.PointsEarned,
	}

	htmlBody, err := s.renderTemplate(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	// Send email
	if err := s.sendEmail(booking.User.Email,
		fmt.Sprintf("Your Filmhouse Ticket - %s", booking.Screening.Film.Title),
		htmlBody, qrPNG); err != nil {
		return err
	}

	// Update booking email status
	now := time.Now()
	booking.EmailSent = true
	booking.EmailSentAt = &now
	s.db.Save(booking)

	return nil
}

// SendGuestTicketEmail sends booking confirmation to guest users
func (s *EmailService) SendGuestTicketEmail(booking *models.Booking, email, name string) error {
	// Load full booking data if not loaded
	if booking.Screening == nil {
		s.db.Preload("Tickets.Seat").
			Preload("Screening.Film").
			Preload("Screening.Hall").
			First(booking, booking.ID)
	}

	// Generate QR code image
	qrPNG, err := qrcode.Encode(booking.QRCode, qrcode.Medium, 256)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Build seat list
	var seats []string
	for _, ticket := range booking.Tickets {
		if ticket.Seat != nil {
			seats = append(seats, fmt.Sprintf("%s%d", ticket.Seat.Row, ticket.Seat.Number))
		}
	}

	// Parse email template
	data := map[string]interface{}{
		"BookingRef":   booking.BookingRef,
		"CustomerName": name,
		"FilmTitle":    booking.Screening.Film.Title,
		"FilmYear":     booking.Screening.Film.Year,
		"FilmRating":   booking.Screening.Film.Rating,
		"FilmDuration": booking.Screening.Film.Duration,
		"HallName":     booking.Screening.Hall.Name,
		"ShowDate":     booking.Screening.StartTime.Format("Monday, 2 January 2006"),
		"ShowTime":     booking.Screening.StartTime.Format("3:04 PM"),
		"Seats":        strings.Join(seats, ", "),
		"TotalAmount":  fmt.Sprintf("$%.2f", booking.FinalAmount),
		"PointsEarned": 0, // No points for guests
	}

	htmlBody, err := s.renderTemplate(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	// Send email
	if err := s.sendEmail(email,
		fmt.Sprintf("Your Filmhouse Ticket - %s", booking.Screening.Film.Title),
		htmlBody, qrPNG); err != nil {
		return err
	}

	// Update booking email status
	now := time.Now()
	booking.EmailSent = true
	booking.EmailSentAt = &now
	s.db.Save(booking)

	return nil
}

func (s *EmailService) sendEmail(to, subject, htmlBody string, qrPNG []byte) error {
	// If Resend not configured, log and return success (for development)
	if s.resendClient == nil {
		fmt.Printf("[EMAIL] Would send to %s: %s\n", to, subject)
		fmt.Printf("[EMAIL] Resend API key not configured - email skipped\n")
		return nil
	}

	// Send via Resend API with QR code attachment
	ctx := context.Background()
	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    htmlBody,
		Attachments: []*resend.Attachment{
			{
				Filename: "ticket-qrcode.png",
				Content:  qrPNG,
			},
		},
	}

	sent, err := s.resendClient.Emails.SendWithContext(ctx, params)
	if err != nil {
		fmt.Printf("[EMAIL] Failed to send to %s: %v\n", to, err)
		return fmt.Errorf("failed to send email: %w", err)
	}

	fmt.Printf("[EMAIL] Sent to %s, ID: %s\n", to, sent.Id)
	return nil
}

// SendMultiScreeningGuestTicketEmail sends booking confirmation for multiple screenings
func (s *EmailService) SendMultiScreeningGuestTicketEmail(bookings []*models.Booking, email, name string) error {
	if len(bookings) == 0 {
		return nil
	}

	// Load full booking data for all bookings
	for _, booking := range bookings {
		if booking.Screening == nil {
			s.db.Preload("Tickets.Seat").Preload("Tickets.TicketType").
				Preload("Screening.Film").Preload("Screening.Hall").
				First(booking, booking.ID)
		}
	}

	// Build screening details for template
	var screeningDetails []map[string]interface{}
	var totalAmount float64
	var allQRCodes []string

	for _, booking := range bookings {
		var seats []string
		for _, ticket := range booking.Tickets {
			if ticket.Seat != nil {
				seatInfo := fmt.Sprintf("%s%d", ticket.Seat.Row, ticket.Seat.Number)
				if ticket.TicketType != nil {
					seatInfo += fmt.Sprintf(" (%s)", ticket.TicketType.Name)
				}
				seats = append(seats, seatInfo)
			}
		}

		screeningDetails = append(screeningDetails, map[string]interface{}{
			"BookingRef":   booking.BookingRef,
			"FilmTitle":    booking.Screening.Film.Title,
			"FilmYear":     booking.Screening.Film.Year,
			"FilmRating":   booking.Screening.Film.Rating,
			"FilmDuration": booking.Screening.Film.Duration,
			"HallName":     booking.Screening.Hall.Name,
			"ShowDate":     booking.Screening.StartTime.Format("Monday, 2 January 2006"),
			"ShowTime":     booking.Screening.StartTime.Format("3:04 PM"),
			"Seats":        strings.Join(seats, ", "),
			"Amount":       fmt.Sprintf("$%.2f", booking.FinalAmount),
		})

		totalAmount += booking.FinalAmount
		allQRCodes = append(allQRCodes, booking.QRCode)
	}

	// Generate combined QR code (use first booking's QR for now)
	qrPNG, err := qrcode.Encode(bookings[0].QRCode, qrcode.Medium, 256)
	if err != nil {
		return fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Render multi-screening template
	data := map[string]interface{}{
		"CustomerName": name,
		"Screenings":   screeningDetails,
		"TotalAmount":  fmt.Sprintf("$%.2f", totalAmount),
		"TicketCount":  len(bookings),
	}

	htmlBody, err := s.renderMultiScreeningTemplate(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	// Send email
	if err := s.sendEmail(email,
		fmt.Sprintf("Your Filmhouse Tickets (%d screenings)", len(bookings)),
		htmlBody, qrPNG); err != nil {
		return err
	}

	// Update all bookings email status
	now := time.Now()
	for _, booking := range bookings {
		booking.EmailSent = true
		booking.EmailSentAt = &now
		s.db.Save(booking)
	}

	return nil
}

func (s *EmailService) renderMultiScreeningTemplate(data map[string]interface{}) (string, error) {
	tmpl := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Filmhouse Tickets</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🎬 Filmhouse</h1>
            <p style="margin: 10px 0 0; opacity: 0.8;">Your E-Tickets ({{.TicketCount}} screenings)</p>
        </div>
        <div style="padding: 30px;">
            <p style="color: #666; margin-bottom: 20px;">Hi {{.CustomerName}}, here are your tickets:</p>
            
            {{range .Screenings}}
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #1a1a2e;">
                <h3 style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0 0 5px;">{{.FilmTitle}}</h3>
                <p style="color: #666; font-size: 12px; margin-bottom: 15px;">{{.FilmYear}} • {{.FilmRating}} • {{.FilmDuration}} mins</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px;">
                    <div><span style="color: #666;">📅</span> {{.ShowDate}}</div>
                    <div><span style="color: #666;">🕐</span> {{.ShowTime}}</div>
                    <div><span style="color: #666;">🎬</span> {{.HallName}}</div>
                    <div><span style="color: #666;">💺</span> {{.Seats}}</div>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between;">
                    <span style="color: #666; font-size: 12px;">Ref: {{.BookingRef}}</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.Amount}}</span>
                </div>
            </div>
            {{end}}
            
            <div style="background: #1a1a2e; color: #fff; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <span>Total Paid</span>
                <span style="font-size: 20px; font-weight: 700;">{{.TotalAmount}}</span>
            </div>
        </div>
        
        <div style="text-align: center; padding: 30px; background: #fafafa; border-top: 2px dashed #ddd;">
            <p style="margin: 0 0 15px; color: #666;">Present QR code at entry for each screening</p>
            <p style="margin: 0; color: #999; font-size: 12px;">QR code attached to this email</p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">Filmhouse Cinemas • filmhouse.sg</p>
            <p style="margin: 5px 0 0;">Please arrive 15 minutes before each showtime</p>
        </div>
    </div>
</body>
</html>`

	t, err := template.New("multi-ticket").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (s *EmailService) renderTemplate(data map[string]interface{}) (string, error) {
	tmpl := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Filmhouse Ticket</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">🎬 Filmhouse</h1>
            <p style="margin: 10px 0 0; opacity: 0.8;">Your E-Ticket</p>
        </div>
        <div style="padding: 30px;">
            <h2 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0 0 5px;">{{.FilmTitle}}</h2>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">{{.FilmYear}} • {{.FilmRating}} • {{.FilmDuration}} mins</p>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Date</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.ShowDate}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Time</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.ShowTime}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Hall</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.HallName}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                    <span style="color: #666;">Seats</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.Seats}}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666;">Total Paid</span>
                    <span style="font-weight: 600; color: #1a1a2e;">{{.TotalAmount}}</span>
                </div>
            </div>
            
            {{if .PointsEarned}}<div style="background: #e8f5e9; color: #2e7d32; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-top: 15px;">🎁 +{{.PointsEarned}} points earned</div>{{end}}
        </div>
        
        <div style="text-align: center; padding: 30px; background: #fafafa; border-top: 2px dashed #ddd;">
            <p style="margin: 0 0 15px; color: #666;">Present this QR code at entry</p>
            <p style="margin: 0; color: #999; font-size: 12px;">QR code attached to this email</p>
            <div style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin-top: 15px; letter-spacing: 2px;">{{.BookingRef}}</div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p style="margin: 0;">Filmhouse Cinemas • filmhouse.sg</p>
            <p style="margin: 5px 0 0;">Please arrive 15 minutes before showtime</p>
        </div>
    </div>
</body>
</html>`

	t, err := template.New("ticket").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
