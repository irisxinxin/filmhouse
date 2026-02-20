package database

import (
	"encoding/json"
	"log"
	"time"

	"filmhouse-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Layout helper types
type seedCell struct {
	Type     string `json:"type"`
	Number   int    `json:"number,omitempty"`
	SeatType string `json:"seat_type,omitempty"`
	Disabled bool   `json:"disabled,omitempty"`
}
type seedRow struct {
	Label string     `json:"label"`
	Seats []seedCell `json:"seats"`
}
type seedLayout struct {
	Rows []seedRow `json:"rows"`
}

// buildRow creates a row with a center aisle. seatsLeft seats, then an aisle, then seatsRight seats.
func buildRow(label string, seatsLeft, seatsRight int) seedRow {
	r := seedRow{Label: label}
	num := 1
	for i := 0; i < seatsLeft; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	r.Seats = append(r.Seats, seedCell{Type: "aisle"})
	for i := 0; i < seatsRight; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	return r
}

// buildRowWithSideAisles creates: sideLeft seats | aisle | centerLeft seats | aisle | centerRight seats | aisle | sideRight seats
func buildRowWithSideAisles(label string, sideLeft, centerLeft, centerRight, sideRight int) seedRow {
	r := seedRow{Label: label}
	num := 1
	for i := 0; i < sideLeft; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	r.Seats = append(r.Seats, seedCell{Type: "aisle"})
	for i := 0; i < centerLeft; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	r.Seats = append(r.Seats, seedCell{Type: "aisle"})
	for i := 0; i < centerRight; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	r.Seats = append(r.Seats, seedCell{Type: "aisle"})
	for i := 0; i < sideRight; i++ {
		r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
		num++
	}
	return r
}

// Green Room layout based on filmhouse.sg Green Room 2 seatmap
// 14 rows (N-A, N=back, A=front near screen)
// Right side has isolated 2-seat sections for rows B-F
// Row A is very short (6 seats), back rows are widest (25-28 seats)
func generateGreenRoomLayout() string {
	layout := seedLayout{}
	// Helper: build a custom row from segment specs: [count, -1=aisle, 0=empty]
	type seg struct{ n int } // positive=seats, 0=aisle, -1=empty
	makeRow := func(label string, segs ...int) seedRow {
		r := seedRow{Label: label}
		num := 1
		for _, s := range segs {
			if s == 0 {
				r.Seats = append(r.Seats, seedCell{Type: "aisle"})
			} else if s < 0 {
				for i := 0; i < -s; i++ {
					r.Seats = append(r.Seats, seedCell{Type: "empty"})
				}
			} else {
				for i := 0; i < s; i++ {
					r.Seats = append(r.Seats, seedCell{Type: "seat", Number: num, SeatType: "standard"})
					num++
				}
			}
		}
		return r
	}
	// From screenshot (bottom=screen, top=back): N,M,L, gap, K,H,G,F,E,D,C,B, A
	// N: 13 seats | aisle | 12 seats = 25
	layout.Rows = append(layout.Rows, makeRow("N", 13, 0, 12))
	// M: 13 seats | aisle | 12 seats = 25
	layout.Rows = append(layout.Rows, makeRow("M", 13, 0, 12))
	// L: 13 seats | aisle | 12 seats = 25
	layout.Rows = append(layout.Rows, makeRow("L", 13, 0, 12))
	// K: 12 seats | aisle | 12 seats = 24
	layout.Rows = append(layout.Rows, makeRow("K", 12, 0, 12))
	// H: 12 seats | aisle | 12 seats = 24
	layout.Rows = append(layout.Rows, makeRow("H", 12, 0, 12))
	// G: 12 seats | aisle | 10 seats | aisle | 2 seats = 24
	layout.Rows = append(layout.Rows, makeRow("G", 12, 0, 10, 0, 2))
	// F: 11 seats | aisle | 11 seats | aisle | 2 seats = 24
	layout.Rows = append(layout.Rows, makeRow("F", 11, 0, 11, 0, 2))
	// E: 10 seats | aisle | 12 seats | aisle | 2 seats = 24
	layout.Rows = append(layout.Rows, makeRow("E", 10, 0, 12, 0, 2))
	// D: 10 seats | aisle | 12 seats | aisle | 2 seats = 24
	layout.Rows = append(layout.Rows, makeRow("D", 10, 0, 12, 0, 2))
	// C: 9 seats | aisle | 12 seats | aisle | 2 seats = 23
	layout.Rows = append(layout.Rows, makeRow("C", 9, 0, 12, 0, 2))
	// B: 9 seats | aisle | 13 seats | aisle | 2 seats = 24
	layout.Rows = append(layout.Rows, makeRow("B", 9, 0, 13, 0, 2))
	// A: 6 seats (front row, very short, centered)
	layout.Rows = append(layout.Rows, makeRow("A", -4, 6, -4))

	b, _ := json.Marshal(layout)
	return string(b)
}

// Redrum: 200 seats, 13 rows (A-M)
// Rows A-D: 2+5+5+2=14
// Rows E-H: 2+6+6+2=16
// Rows I-J: 3+5+5+3=16
// Rows K-M: 3+6+6+3=18
// Total: 4×14 + 4×16 + 2×16 + 3×18 = 56+64+32+54 = 206... need 200
// Adjust: A-F=14, G-J=16, K-M=18 → 6×14+4×16+3×18 = 84+64+54 = 202
// Adjust: A-F=14, G-I=16, J=14, K-M=18 → 6×14+3×16+1×14+3×18 = 84+48+14+54 = 200 ✓
func generateRedrumLayout() string {
	layout := seedLayout{}
	rowLabels := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"}
	for i, label := range rowLabels {
		switch {
		case i >= 10: // rows K-M: widest back
			layout.Rows = append(layout.Rows, buildRowWithSideAisles(label, 3, 6, 6, 3))
		case i == 9: // row J: transition row, slightly narrower
			layout.Rows = append(layout.Rows, buildRowWithSideAisles(label, 2, 5, 5, 2))
		case i >= 6: // rows G-I
			layout.Rows = append(layout.Rows, buildRowWithSideAisles(label, 3, 5, 5, 3))
		default: // rows A-F
			layout.Rows = append(layout.Rows, buildRowWithSideAisles(label, 2, 5, 5, 2))
		}
	}
	b, _ := json.Marshal(layout)
	return string(b)
}

// Blue Room: 100 seats, 10 rows (A-J), ~11-12 seats/row
// Center aisle only, no side aisles (smallest hall)
// Layout per row: 5 | aisle | 5 = 10 seats
func generateBlueRoomLayout() string {
	layout := seedLayout{}
	rowLabels := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"}
	for _, label := range rowLabels {
		layout.Rows = append(layout.Rows, buildRow(label, 5, 5))
	}
	b, _ := json.Marshal(layout)
	return string(b)
}

func seatsFromLayout(hallID uint, layoutJSON string) []models.Seat {
	var layout seedLayout
	json.Unmarshal([]byte(layoutJSON), &layout)
	var seats []models.Seat
	for _, row := range layout.Rows {
		for _, cell := range row.Seats {
			if cell.Type != "seat" {
				continue
			}
			st := cell.SeatType
			if st == "" {
				st = "standard"
			}
			seats = append(seats, models.Seat{
				HallID:   hallID,
				Row:      row.Label,
				Number:   cell.Number,
				SeatType: st,
				IsActive: !cell.Disabled,
			})
		}
	}
	return seats
}

func Seed(db *gorm.DB) error {
	log.Println("Seeding database...")

	// Seed memberships
	memberships := []models.Membership{
		{Name: "Free", Description: "Free membership with points collection", Price: 0, Discount: 0},
		{Name: "Silver", Description: "5% discount on all tickets", Price: 50, Discount: 5},
		{Name: "Gold", Description: "10% discount on all tickets", Price: 100, Discount: 10},
	}
	for _, m := range memberships {
		db.FirstOrCreate(&m, models.Membership{Name: m.Name})
	}

	// Seed admin user
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := models.User{
		Email:     "admin@filmhouse.sg",
		Password:  string(hashedPassword),
		FirstName: "Admin",
		LastName:  "User",
		Role:      "admin",
	}
	db.FirstOrCreate(&admin, models.User{Email: admin.Email})

	// Seed halls with realistic Filmhouse layouts
	greenLayout := generateGreenRoomLayout()
	blueLayout := generateBlueRoomLayout()
	redrumLayout := generateRedrumLayout()

	type hallDef struct {
		Name     string
		Is4K     bool
		Layout   string
	}
	hallDefs := []hallDef{
		{Name: "Green Room", Is4K: true, Layout: greenLayout},
		{Name: "Blue Room", Is4K: false, Layout: blueLayout},
		{Name: "Redrum", Is4K: false, Layout: redrumLayout},
	}

	halls := make([]models.Hall, 0, len(hallDefs))
	for _, hd := range hallDefs {
		var existing models.Hall
		result := db.Where("name = ?", hd.Name).First(&existing)
		if result.Error == gorm.ErrRecordNotFound {
			existing = models.Hall{
				Name:       hd.Name,
				Is4K:       hd.Is4K,
				SeatLayout: hd.Layout,
				IsActive:   true,
			}
			db.Create(&existing)
		} else {
			// Update layout if empty
			if existing.SeatLayout == "" || existing.SeatLayout == "null" {
				existing.SeatLayout = hd.Layout
				db.Save(&existing)
			}
		}
		halls = append(halls, existing)
	}

	// Seed seats from layouts
	for _, hall := range halls {
		var seatCount int64
		db.Model(&models.Seat{}).Where("hall_id = ?", hall.ID).Count(&seatCount)
		if seatCount > 0 {
			continue
		}
		seats := seatsFromLayout(hall.ID, hall.SeatLayout)
		if len(seats) > 0 {
			db.Create(&seats)
			db.Model(&models.Hall{}).Where("id = ?", hall.ID).Update("capacity", len(seats))
		}
	}

	// Deactivate old halls that don't match new names
	oldHallNames := []string{"Blue Room 1", "Blue Room 2", "Blue Room 3"}
	db.Model(&models.Hall{}).Where("name IN ?", oldHallNames).Update("is_active", false)

	// Seed sample films (matching Filmhouse SG)
	films := []models.Film{
		{
			Title:      "Hamnet",
			Slug:       "hamnet",
			Year:       2026,
			Duration:   126,
			Rating:     "M18",
			Genre:      "Romance",
			Synopsis:   "The powerful story of love and loss that inspired the creation of Shakespeare's timeless masterpiece, Hamlet. In English with English and Chinese dual subtitles.",
			Language:   "English",
			Subtitles:  "English and Chinese",
			PosterURL:  "/images/films/hamnet.jpg",
			BannerURL:  "/images/banners/hamnet-banner.jpg",
			Awards:     "Academy Awards 2026 Nominee for Best Picture, Best Director, Best Actress and Best Original Score. Golden Globes 2026 Winner Best Drama Motion Picture, Best Female Actress in Motion Picture.",
			IsFeatured: true,
			IsActive:   true,
		},
		{
			Title:      "It Was Just an Accident",
			Slug:       "it-was-just-an-accident",
			Year:       2026,
			Duration:   103,
			Rating:     "PG13",
			Genre:      "Thriller/Suspense",
			Synopsis:   "An unassuming mechanic is reminded of his time in an Iranian prison when he encounters a man he suspects to be his sadistic jailhouse captor. In Farsi with English subtitles. From the director of Taxi.",
			Director:   "Jafar Panahi",
			Language:   "Farsi",
			Subtitles:  "English",
			PosterURL:  "/images/films/it-was-just-an-accident.jpg",
			BannerURL:  "/images/banners/it-was-just-an-accident-banner.jpg",
			Awards:     "Cannes Film Festival 2025 Palme d'Or Winner. Academy Awards 2026 Nominee for Best International Feature Film and Best Original Screenplay.",
			IsFeatured: true,
			IsActive:   true,
		},
		{
			Title:      "10s Across the Borders",
			Slug:       "10s-across-the-borders",
			Year:       2026,
			Duration:   99,
			Rating:     "R21",
			Genre:      "Documentary",
			Synopsis:   "If the world doesn't accept you and your kind, trailblaze a world that does. Inspired by the Black and Latinx underground Ballroom culture of New York, Sun, Teddy, and Xyza create Ballroom communities in Southeast Asia as safe havens from homophobia, transphobia, color discrimination and HIV stigma.",
			Director:   "Chan Sze-Wei",
			Language:   "Tagalog, Thai, English, Mandarin",
			Subtitles:  "English",
			PosterURL:  "/images/films/10s-across-the-borders.jpg",
			IsFeatured: false,
			IsActive:   true,
		},
		{
			Title:      "Sentimental Value",
			Slug:       "sentimental-value",
			Year:       2026,
			Duration:   133,
			Rating:     "M18",
			Genre:      "Drama",
			Synopsis:   "Sisters Nora and Agnes reunite with their estranged father, the charismatic Gustav, a once-renowned director who offers stage actress Nora a role in what he hopes will be his comeback film. When Nora turns it down, she soon discovers he has given her part to an eager young Hollywood star. In Norwegian and English with English subtitles.",
			Language:   "Norwegian, English",
			Subtitles:  "English",
			PosterURL:  "/images/films/sentimental-value.jpg",
			BannerURL:  "/images/banners/sentimental-value-banner.jpg",
			Awards:     "Cannes Film Festival 2025 Grand Prix Winner. Academy Awards 2026 Nominee for Best Picture, Best International Feature Film, Best Director, Best Actress and Best Supporting Actor. BIFA 2025 Best International Independent Film.",
			IsFeatured: true,
			IsActive:   true,
		},
		{
			Title:      "Thirst",
			Slug:       "thirst",
			Year:       2009,
			Duration:   134,
			Rating:     "R21",
			Genre:      "Horror",
			Synopsis:   "A respected priest volunteers for an experimental procedure that may lead to a cure for a deadly virus. He gets infected and dies, but a blood transfusion of unknown origin brings him back to life. Now, he's torn between faith and bloodlust, and has a newfound desire for the wife of a childhood friend. In Korean with English subtitles. From the Director of Oldboy, Handmaiden, Decision to Leave and No Other Choice.",
			Director:   "Park Chan-wook",
			Language:   "Korean",
			Subtitles:  "English",
			PosterURL:  "/images/films/thirst.jpg",
			BannerURL:  "/images/banners/thirst-banner.jpg",
			TrailerURL: "https://www.youtube.com/embed/j9XMJJ5DZso",
			Awards:     "Cannes Film Festival 2009 Jury Prize Winner.",
			IsFeatured: true,
			IsActive:   true,
		},
		{
			Title:      "Little Miss Sunshine (20th Anniversary)",
			Slug:       "little-miss-sunshine-20th-anniversary",
			Year:       2006,
			Duration:   102,
			Rating:     "NC16",
			Genre:      "Comedy",
			Synopsis:   "A family loaded with quirky, colorful characters piles into an old van and road trips to California for little Olive to compete in a beauty pageant. 20th Anniversary screening.",
			Language:   "English",
			Subtitles:  "",
			PosterURL:  "/images/films/little-miss-sunshine.jpg",
			BannerURL:  "/images/banners/little-miss-sunshine-banner.jpg",
			Awards:     "Academy Awards 2007 Best Original Screenplay, Best Supporting Actor.",
			IsFeatured: false,
			IsActive:   true,
		},
		{
			Title:      "Rental Family",
			Slug:       "rental-family",
			Year:       2026,
			Duration:   110,
			Rating:     "M18",
			Genre:      "Comedy",
			Synopsis:   "An American actor in Tokyo struggles to find purpose until he lands an unusual gig: working for a Japanese 'rental family' agency, playing stand-in roles for strangers. As he immerses himself in his clients' worlds, he begins to form genuine bonds that blur the lines between performance and reality. In English and Japanese with English and Mandarin Dual subtitles.",
			Language:   "English, Japanese",
			Subtitles:  "English, Mandarin",
			PosterURL:  "/images/films/rental-family.jpg",
			Awards:     "Chicago International Film Festival 2025 Audience Choice Award.",
			IsFeatured: false,
			IsActive:   true,
		},
		{
			Title:      "Sirāt",
			Slug:       "sirat",
			Year:       2026,
			Duration:   115,
			Rating:     "NC16",
			Genre:      "Drama",
			Synopsis:   "A man and his son arrive at a rave lost in the mountains of Morocco. They are looking for Marina, their daughter and sister, who disappeared months ago at another rave. Driven by fate, they decide to follow a group of ravers in search of one last party, in hopes Marina will be there. In Spanish with English subtitles.",
			Language:   "Spanish",
			Subtitles:  "English",
			PosterURL:  "/images/films/sirat.jpg",
			Awards:     "Academy Awards 2026 Nominee for Best International Feature Film and Best Sound. Cannes Film Festival 2025 Jury Prize Winner and Cannes Soundtrack Award Winner.",
			IsFeatured: false,
			IsActive:   true,
		},
		{
			Title:      "A Useful Ghost",
			Slug:       "a-useful-ghost",
			Year:       2026,
			Duration:   95,
			Rating:     "R21",
			Genre:      "Comedy/Satire",
			Synopsis:   "A genre-bending satire where a woman returns from the dead to possess a vacuum cleaner, determined to prove her love to her husband by exorcising the chaos in their home.",
			Language:   "Mandarin",
			Subtitles:  "English",
			IsFeatured: false,
			IsActive:   true,
		},
		{
			Title:      "No Other Choice",
			Slug:       "no-other-choice",
			Year:       2026,
			Duration:   128,
			Rating:     "M18",
			Genre:      "Thriller",
			Synopsis:   "From the director of Oldboy and Decision to Leave. A gripping thriller about impossible choices and their devastating consequences.",
			Director:   "Park Chan-wook",
			Language:   "Korean",
			Subtitles:  "English",
			IsFeatured: false,
			IsActive:   true,
		},
	}
	for i := range films {
		db.FirstOrCreate(&films[i], models.Film{Slug: films[i].Slug})
	}

	// Fetch all films and halls for seeding relationships
	var allFilms []models.Film
	db.Find(&allFilms)

	var allHalls []models.Hall
	db.Find(&allHalls)

	// Seed programs (curated themes like filmhouse.sg)
	programs := []models.Program{
		{Name: "Coming Soon", Slug: "coming-soon", Description: "Coming soon to Filmhouse", SortOrder: 1, IsActive: true},
		{Name: "Found Families", Slug: "found-families", Description: "Stories about the families we choose and the bonds that transcend blood", SortOrder: 2, IsActive: true},
		{Name: "Love Is a Monster", Slug: "love-is-a-monster", Description: "When love consumes, transforms, and terrifies", SortOrder: 3, IsActive: true},
	}
	for i := range programs {
		db.FirstOrCreate(&programs[i], models.Program{Slug: programs[i].Slug})
	}

	// Reactivate coming-soon, deactivate old programs
	db.Model(&models.Program{}).Where("slug = ?", "coming-soon").Update("is_active", true)
	db.Model(&models.Program{}).Where("slug IN ?", []string{"now-showing", "special-screenings"}).Update("is_active", false)

	// Associate films to themed programs
	// "Found Families": Rental Family, Little Miss Sunshine, Sentimental Value
	var foundFamilies models.Program
	db.Where("slug = ?", "found-families").First(&foundFamilies)
	if foundFamilies.ID != 0 {
		for _, slug := range []string{"rental-family", "little-miss-sunshine-20th-anniversary", "sentimental-value"} {
			var film models.Film
			if db.Where("slug = ?", slug).First(&film).Error == nil {
				pf := models.ProgramFilm{ProgramID: foundFamilies.ID, FilmID: film.ID}
				db.FirstOrCreate(&pf, models.ProgramFilm{ProgramID: foundFamilies.ID, FilmID: film.ID})
			}
		}
	}

	// "Love Is a Monster": Thirst, Hamnet, Sirāt
	var loveMonster models.Program
	db.Where("slug = ?", "love-is-a-monster").First(&loveMonster)
	if loveMonster.ID != 0 {
		for _, slug := range []string{"thirst", "hamnet", "sirat"} {
			var film models.Film
			if db.Where("slug = ?", slug).First(&film).Error == nil {
				pf := models.ProgramFilm{ProgramID: loveMonster.ID, FilmID: film.ID}
				db.FirstOrCreate(&pf, models.ProgramFilm{ProgramID: loveMonster.ID, FilmID: film.ID})
			}
		}
	}

	// "Coming Soon": A Useful Ghost, No Other Choice (no screenings yet)
	var comingSoon models.Program
	db.Where("slug = ?", "coming-soon").First(&comingSoon)
	if comingSoon.ID != 0 {
		for _, slug := range []string{"a-useful-ghost", "no-other-choice"} {
			var film models.Film
			if db.Where("slug = ?", slug).First(&film).Error == nil {
				pf := models.ProgramFilm{ProgramID: comingSoon.ID, FilmID: film.ID}
				db.FirstOrCreate(&pf, models.ProgramFilm{ProgramID: comingSoon.ID, FilmID: film.ID})
			}
		}
	}

	// Seed screenings for the next 7 days (only for films that are NOT coming soon)

	now := time.Now()
	for day := 0; day < 7; day++ {
		date := now.AddDate(0, 0, day)
		for _, film := range allFilms {
			for i, hall := range allHalls {
				// Create 2-3 screenings per film per day
				times := []int{13, 17, 20} // 1pm, 5pm, 8pm
				if i >= len(times) {
					continue
				}
				
				startTime := time.Date(date.Year(), date.Month(), date.Day(), times[i]+i, 30, 0, 0, time.Local)
				endTime := startTime.Add(time.Duration(film.Duration) * time.Minute)
				
				screening := models.Screening{
					FilmID:    film.ID,
					HallID:    hall.ID,
					StartTime: startTime,
					EndTime:   endTime,
					Price:     15.00,
					IsActive:  true,
				}
				
				// Check if screening already exists
				var existing models.Screening
				result := db.Where("film_id = ? AND hall_id = ? AND start_time = ?", 
					film.ID, hall.ID, startTime).First(&existing)
				if result.Error == gorm.ErrRecordNotFound {
					db.Create(&screening)
				}
			}
		}
	}

	log.Println("Database seeding completed")
	return nil
}
