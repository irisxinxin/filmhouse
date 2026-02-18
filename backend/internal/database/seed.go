package database

import (
	"log"
	"time"

	"filmhouse-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

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

	// Seed halls
	halls := []models.Hall{
		{Name: "Blue Room 1", Capacity: 80, Is4K: false},
		{Name: "Blue Room 2", Capacity: 60, Is4K: false},
		{Name: "Blue Room 3", Capacity: 100, Is4K: true},
	}
	for i := range halls {
		db.FirstOrCreate(&halls[i], models.Hall{Name: halls[i].Name})
	}

	// Seed seats for each hall
	for _, hall := range halls {
		var existingHall models.Hall
		db.Where("name = ?", hall.Name).First(&existingHall)
		
		var seatCount int64
		db.Model(&models.Seat{}).Where("hall_id = ?", existingHall.ID).Count(&seatCount)
		if seatCount > 0 {
			continue
		}

		// Create seats based on hall capacity
		rows := []string{"A", "B", "C", "D", "E", "F", "G"}
		seatsPerRow := existingHall.Capacity / len(rows)
		
		for _, row := range rows {
			for num := 1; num <= seatsPerRow; num++ {
				seat := models.Seat{
					HallID:   existingHall.ID,
					Row:      row,
					Number:   num,
					SeatType: "standard",
					IsActive: true,
				}
				// Skip some seats to create aisles (like filmhouse.sg)
				if (num == 3 || num == 4) && row != "B" && row != "G" {
					continue
				}
				db.Create(&seat)
			}
		}
	}

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
