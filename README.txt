

	20 rum
		10 enkelrum
		5 dubbel
		5 svit

		Två tables
			- Bokningar
				Boknings ID:
				vilka rum:
				gäster:
				total pris:
				incheck:
				utcheck:
				Bokad i namn:
				e-post:
				

			- Rum
				rumsnummer:
				datum: [
					{ date: 1/1/25, avalible: number},
					]
				
				



Vilken nivå ska vi lägga oss på?
		Lägg VG delen i slutet och gör i mån om tid.


Databas struktur X secondary key nödvändig?
		 X vilka parametrar+
		 - bestämm redan innan format och namngivning

filstruktur	 - vilka filer i vilka mappar
		 - vad behöver egna filer/mappar
		 - vad ska saker heta?

endpoints och functioner.

			/bonzai
			/bonzai/guest/boka
				POST bokning som gäst, få bekräftelse
					För att boka ett rum krävs.
						- Antal gäster (se nedan för affärslogik kring rum)
						 -Vilka rumstyper och antal (se nedan för affärslogik kring rum)
						 -Datum för in-och utcheckning
						 -Namn och e-postaddress på den som bokar
						 -Ett id på bokning (detta kan dock genereras på backend med exempelvis uuid eller nanoid )


						{
                					rooms: { 0, 0, 0 },
                					guests: ,
                					checkIn:,
                					checkOut:,
                					name:,
                					email: 
						}

					Bekräftelsen ska innehålla:
						- Bokningsnummer
						- Antalet gäster och rum
						- Total summa att betala
						- In-och utcheckningsdatum
						- Namn på gästen som bokat

			/bonzai/guest/avboka
				DELETE bokning som gäst, få bekräftelse
					Avbokningspolicy VG-krav
						- En bokning kan avbokas senast två dagar in incheckningsdatum och kan enbart avbokas i sin helhet.

			/bonzai/guest/omboka
				PUT bokning som gäst, få bekräftelse
					Följande detaljer kan ändras i en bokning men logiken för rummen ska följas om antalet gäster eller rum ändras:
						- Antal gäster
    						- Vilka rumstyper och antal
  						- Datum för in-och utcheckning

			/bonzai/emp/reservation
				GET alla bokningar 
					Följande ska man kunna se om varje bokning:
						- Bokningsnummer
						- In-och utcheckningsdatum
  						- Antal gäster
						- Antalet rum
						- Namn på den som bokade rummet


		Extra funktioner
			/bonzai/emp/reservation/{id}
				GET alla bokningar för ett specifikt rum
			/bonzai/emp/reservation/date=?
				GET alla bokningar för ett specifikt datum
				




		 X bestäm vilka endpoints vi ska ha
		 X vilka functioner ska vi ha och vilka endpoints ska dom ligga på?
		 X bestäm format på requests
		 X bestäm format på responses

Testning och slutförande.
		 X föreslår att allt ska vara klart på torsdag och vi bara testkör allt på fredagen.

Vem gör vad
		 - bestäm vem som ska göra vilken del
		 - skicka merge-requets när vi gjort klar delar
		 - daily standup? nightly standup?

Github
		 X vem skapar repo
		 X main - dev - ticket  struktur på branches
		 - 









functioner
		Kolla vilka rum som är lediga den dagen
		funktion för att skapa rum/datum entries i rum-tabellen.

	