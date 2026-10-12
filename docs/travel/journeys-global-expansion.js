const art = (mode) => `assets/world/${mode}.svg`;

const moment = (id, label, title, image) => ({
  id,
  label,
  title,
  copy: 'A scene worth travelling for.',
  image,
});

const chapter = (id, label, title, location, narrative, image, kind = 'leg') => ({
  id,
  kind,
  dayLabel: label,
  title,
  location,
  narrative,
  image,
  operational: {
    timing: 'Curated timing',
    transit: 'Indicative routing',
    note: 'Final timings depend on selected dates.',
  },
  agnes: 'AGNES can adapt pace, emphasis and practical detail for this journey.',
});

function makeJourney(config) {
  const image = art(config.mode);
  const route = config.route ?? [config.region];
  return {
    id: config.id,
    type: config.type,
    mode: config.mode,
    title: config.title,
    subtitle: config.subtitle,
    country: config.country,
    region: config.region,
    duration: config.duration,
    feelings: config.feelings ?? [],
    editorialPriority: config.editorialPriority ?? 70,
    hero: {
      eyebrow: `${config.region} · ${config.mode.toUpperCase()}`,
      title: config.title,
      story: config.subtitle,
      image,
      cta: 'EXPLORE THIS JOURNEY →',
    },
    bestMonths: config.bestMonths ?? [],
    shoulderMonths: config.shoulderMonths ?? [],
    eventMonths: config.eventMonths ?? [],
    avoidMonths: config.avoidMonths ?? [],
    yearRound: Boolean(config.yearRound),
    departurePorts: config.departurePorts ?? [],
    signatureMoments: [
      moment(`${config.id}-m1`, 'SIGNATURE MOMENT', config.moments?.[0] ?? route[0], image),
      moment(`${config.id}-m2`, 'THE JOURNEY', config.moments?.[1] ?? route[1] ?? route[0], image),
      moment(`${config.id}-m3`, 'THE MEMORY', config.moments?.[2] ?? route.at(-1), image),
    ],
    route: {
      stops: route.map((name, index) => ({ id: `${config.id}-stop-${index + 1}`, name, short: '' })),
    },
    chapters: [
      chapter('departure', 'DEPARTURE', 'The journey begins', route[0], config.subtitle, image, 'departure'),
      chapter('chapter-1', 'CHAPTER 1', config.moments?.[0] ?? 'Arrive inside the story', config.region, 'Slow down enough to notice the place, not just reach it.', image),
      chapter('chapter-2', 'CHAPTER 2', config.moments?.[1] ?? 'Move through the landscape', config.region, 'The route is designed as part of the experience.', image),
      chapter('return', 'RETURN', 'The road home', route.at(-1), 'Leave with a clear ending rather than a rushed checkout.', image, 'return'),
    ],
    operationalDays: [],
    stays: [],
    transport: { mode: config.mode, label: config.transportLabel ?? config.mode },
    pricing: {
      indicative: true,
      label: 'Plan with AGNES',
      disclaimer: 'Editorial journey. Pricing and availability are not live.',
    },
    agnesRules: {
      quickActions: ['Make it shorter', 'More romantic', 'Family-friendly', 'Show the practical plan'],
    },
    media: { hero: image, gallery: [image] },
    ...(config.cruise ? { cruise: config.cruise } : {}),
  };
}

export const GLOBAL_EXPANSION_JOURNEYS = [
  makeJourney({ id: 'california-pacific-coast', type: 'road-trip', mode: 'road', title: 'California Pacific Coast', subtitle: 'Cliffs, ocean light and iconic Highway 1.', country: 'USA', region: 'North America', duration: '8 days', bestMonths: [4,5,6,9,10], shoulderMonths: [3,11], feelings: ['sea','wild','romantic'], editorialPriority: 94, route: ['San Francisco','Monterey','Big Sur','Santa Barbara','Los Angeles'], moments: ['Golden Gate departure','Big Sur cliffs','Pacific sunset'] }),
  makeJourney({ id: 'canadian-rockies-drive', type: 'road-trip', mode: 'road', title: 'Canadian Rockies Drive', subtitle: 'Glacial lakes, alpine roads and vast western skies.', country: 'Canada', region: 'North America', duration: '9 days', bestMonths: [6,7,8,9], shoulderMonths: [5,10], feelings: ['wild','slow'], editorialPriority: 95, route: ['Calgary','Banff','Lake Louise','Icefields Parkway','Jasper'], moments: ['Moraine Lake','Icefields Parkway','Jasper dawn'] }),
  makeJourney({ id: 'patagonia-end-of-world', type: 'road-trip', mode: 'road', title: 'Patagonia · End of the World', subtitle: 'Wind, granite peaks and roads that dissolve into wilderness.', country: 'Argentina / Chile', region: 'South America', duration: '12 days', bestMonths: [11,12,1,2,3], shoulderMonths: [10,4], feelings: ['wild','hidden'], editorialPriority: 99, route: ['El Calafate','El Chaltén','Torres del Paine','Punta Arenas'], moments: ['Fitz Roy sunrise','Torres del Paine road','Patagonian steppe'] }),
  makeJourney({ id: 'garden-route-cape', type: 'road-trip', mode: 'road', title: 'Cape Town · Garden Route', subtitle: 'Ocean roads, vineyards and a long South African horizon.', country: 'South Africa', region: 'Africa', duration: '9 days', bestMonths: [2,3,4,9,10,11], shoulderMonths: [1,5,8,12], feelings: ['sea','wild','luxury'], editorialPriority: 93, route: ['Cape Town','Hermanus','Knysna','Tsitsikamma','Gqeberha'], moments: ['Chapman’s Peak','Whale coast','Tsitsikamma forest'] }),
  makeJourney({ id: 'morocco-atlas-sahara', type: 'road-trip', mode: 'road', title: 'Morocco · Atlas to Sahara', subtitle: 'Mountain passes, kasbahs and desert silence.', country: 'Morocco', region: 'Africa', duration: '8 days', bestMonths: [3,4,5,9,10,11], shoulderMonths: [2,12], avoidMonths: [7,8], feelings: ['hidden','wild','romantic'], editorialPriority: 96, route: ['Marrakech','Aït Benhaddou','Dades','Merzouga'], moments: ['Tizi n’Tichka','Dades road','Sahara sunset'] }),
  makeJourney({ id: 'new-zealand-south-island', type: 'caravan-road-trip', mode: 'road', title: 'New Zealand · South Island', subtitle: 'Alpine passes, fjords and freedom on four wheels.', country: 'New Zealand', region: 'Oceania', duration: '12 days', bestMonths: [11,12,1,2,3], shoulderMonths: [10,4], feelings: ['wild','slow'], editorialPriority: 98, route: ['Christchurch','Lake Tekapo','Queenstown','Milford Sound','Wanaka'], moments: ['Lake Tekapo night sky','Milford road','Wanaka morning'] }),
  makeJourney({ id: 'great-ocean-road', type: 'road-trip', mode: 'road', title: 'Australia · Great Ocean Road', subtitle: 'Surf towns, rainforest and limestone cliffs.', country: 'Australia', region: 'Oceania', duration: '5 days', bestMonths: [2,3,4,10,11], shoulderMonths: [1,5,9,12], feelings: ['sea','slow'], editorialPriority: 88, route: ['Melbourne','Torquay','Apollo Bay','Port Campbell'], moments: ['Bells Beach','Otway rainforest','Twelve Apostles'] }),

  makeJourney({ id: 'norway-fjords-rail', type: 'rail-journey', mode: 'rail', title: 'Norway · Fjords by Rail', subtitle: 'Mountain railways, deep fjords and Nordic light.', country: 'Norway', region: 'Europe', duration: '7 days', bestMonths: [5,6,7,8,9], shoulderMonths: [4,10], feelings: ['slow','wild'], editorialPriority: 96, route: ['Oslo','Flåm','Bergen'], moments: ['Bergen Railway','Flåm descent','Fjord arrival'] }),
  makeJourney({ id: 'spain-grand-rail', type: 'rail-journey', mode: 'rail', title: 'Spain · Madrid to Andalucía', subtitle: 'Fast trains into plazas, palaces and southern evenings.', country: 'Spain', region: 'Europe', duration: '8 days', bestMonths: [3,4,5,9,10,11], shoulderMonths: [2,6,12], feelings: ['romantic','seasonal'], editorialPriority: 90, route: ['Madrid','Córdoba','Seville','Granada'], moments: ['Madrid departure','Seville evening','Alhambra morning'] }),
  makeJourney({ id: 'vietnam-reunification-rail', type: 'rail-journey', mode: 'rail', title: 'Vietnam · Reunification Railway', subtitle: 'A slow north-to-south passage through coast, city and rice country.', country: 'Vietnam', region: 'Asia', duration: '11 days', bestMonths: [2,3,4,10,11], shoulderMonths: [1,5,12], feelings: ['slow','hidden'], editorialPriority: 93, route: ['Hanoi','Huế','Da Nang','Nha Trang','Ho Chi Minh City'], moments: ['Hanoi departure','Hai Van Pass','Southern arrival'] }),
  makeJourney({ id: 'india-rajasthan-rail', type: 'rail-journey', mode: 'rail', title: 'India · Rajasthan by Rail', subtitle: 'Fort cities, desert colour and overnight railway rhythm.', country: 'India', region: 'Asia', duration: '10 days', bestMonths: [10,11,12,1,2,3], shoulderMonths: [9,4], feelings: ['hidden','romantic'], editorialPriority: 94, route: ['Delhi','Jaipur','Jodhpur','Udaipur'], moments: ['Jaipur arrival','Blue City rooftops','Udaipur lake light'] }),
  makeJourney({ id: 'canada-transcontinental-rail', type: 'rail-journey', mode: 'rail', title: 'Canada · Transcontinental Rail', subtitle: 'Cities, prairie and Rockies from a panoramic window.', country: 'Canada', region: 'North America', duration: '9 days', bestMonths: [5,6,7,8,9], shoulderMonths: [4,10], feelings: ['slow','wild'], editorialPriority: 92, route: ['Toronto','Winnipeg','Jasper','Vancouver'], moments: ['Prairie horizon','Rockies arrival','Pacific terminus'] }),
  makeJourney({ id: 'australia-ghan', type: 'rail-journey', mode: 'rail', title: 'Australia · The Ghan', subtitle: 'A continent crossed from tropical north to red-centre south.', country: 'Australia', region: 'Oceania', duration: '4 days', bestMonths: [4,5,6,7,8,9], shoulderMonths: [3,10], feelings: ['luxury','wild','slow'], editorialPriority: 95, route: ['Darwin','Katherine','Alice Springs','Adelaide'], moments: ['Top End departure','Red Centre','Adelaide arrival'] }),

  makeJourney({ id: 'caribbean-from-miami', type: 'cruise', mode: 'sea', title: 'Caribbean from Miami', subtitle: 'Warm water, island mornings and easy tropical rhythm.', country: 'USA / Caribbean', region: 'Caribbean', duration: '7 nights', bestMonths: [1,2,3,4,11,12], shoulderMonths: [5,10], feelings: ['sea','islands','family'], editorialPriority: 97, departurePorts: ['miami'], route: ['Miami','Nassau','St Thomas','St Maarten','Miami'], moments: ['Miami sail-away','Caribbean blue','Island evening'], cruise: { departurePort: 'miami', returnPort: 'miami', portsOfCall: ['Nassau','St Thomas','St Maarten'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'alaska-from-vancouver', type: 'cruise', mode: 'sea', title: 'Alaska from Vancouver', subtitle: 'Glaciers, forested channels and long northern light.', country: 'Canada / USA', region: 'North America', duration: '7 nights', bestMonths: [5,6,7,8,9], shoulderMonths: [4,10], feelings: ['sea','wild'], editorialPriority: 99, departurePorts: ['vancouver'], route: ['Vancouver','Inside Passage','Juneau','Skagway','Glacier Bay','Vancouver'], moments: ['Inside Passage','Glacier face','Northern twilight'], cruise: { departurePort: 'vancouver', returnPort: 'vancouver', portsOfCall: ['Juneau','Skagway','Glacier Bay'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'norwegian-fjords-southampton', type: 'cruise', mode: 'sea', title: 'Norwegian Fjords from Southampton', subtitle: 'Sail north into waterfalls, cliffs and bright Nordic evenings.', country: 'United Kingdom / Norway', region: 'Europe', duration: '7 nights', bestMonths: [5,6,7,8,9], shoulderMonths: [4,10], feelings: ['sea','wild','slow'], editorialPriority: 94, departurePorts: ['southampton'], route: ['Southampton','Stavanger','Flåm','Geiranger','Bergen','Southampton'], moments: ['North Sea crossing','Geirangerfjord','Bergen harbour'], cruise: { departurePort: 'southampton', returnPort: 'southampton', portsOfCall: ['Stavanger','Flåm','Geiranger','Bergen'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'arabian-gulf-dubai', type: 'cruise', mode: 'sea', title: 'Arabian Gulf from Dubai', subtitle: 'Skyline nights, desert light and warm winter seas.', country: 'UAE / Qatar', region: 'Middle East', duration: '7 nights', bestMonths: [1,2,3,11,12], shoulderMonths: [4,10], avoidMonths: [6,7,8], feelings: ['sea','luxury'], editorialPriority: 91, departurePorts: ['dubai'], route: ['Dubai','Abu Dhabi','Doha','Sir Bani Yas','Dubai'], moments: ['Dubai sail-away','Doha skyline','Desert island day'], cruise: { departurePort: 'dubai', returnPort: 'dubai', portsOfCall: ['Abu Dhabi','Doha','Sir Bani Yas'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'japan-islands-yokohama', type: 'cruise', mode: 'sea', title: 'Japan Islands from Yokohama', subtitle: 'Temple cities, volcanic coasts and Japanese port culture.', country: 'Japan', region: 'Asia', duration: '9 nights', bestMonths: [3,4,5,10,11], shoulderMonths: [2,6,9,12], feelings: ['sea','hidden','seasonal'], editorialPriority: 96, departurePorts: ['yokohama'], route: ['Yokohama','Kobe','Hiroshima','Nagasaki','Kagoshima','Yokohama'], moments: ['Tokyo Bay departure','Inland Sea','Kagoshima volcano'], cruise: { departurePort: 'yokohama', returnPort: 'yokohama', portsOfCall: ['Kobe','Hiroshima','Nagasaki','Kagoshima'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'australia-new-zealand-sydney', type: 'cruise', mode: 'sea', title: 'Australia & New Zealand from Sydney', subtitle: 'Harbour departure, Tasman crossing and dramatic southern fjords.', country: 'Australia / New Zealand', region: 'Oceania', duration: '12 nights', bestMonths: [11,12,1,2,3], shoulderMonths: [10,4], feelings: ['sea','wild'], editorialPriority: 95, departurePorts: ['sydney'], route: ['Sydney','Melbourne','Milford Sound','Dunedin','Wellington','Auckland'], moments: ['Sydney Harbour','Milford Sound','Auckland arrival'], cruise: { departurePort: 'sydney', returnPort: 'sydney', portsOfCall: ['Melbourne','Milford Sound','Dunedin','Wellington','Auckland'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),
  makeJourney({ id: 'mediterranean-from-barcelona', type: 'cruise', mode: 'sea', title: 'Mediterranean from Barcelona', subtitle: 'One sea, many cultures: Catalonia to Italy and back.', country: 'Spain / France / Italy', region: 'Europe', duration: '7 nights', bestMonths: [4,5,6,7,8,9,10], shoulderMonths: [3,11], feelings: ['sea','romantic','family'], editorialPriority: 93, departurePorts: ['barcelona'], route: ['Barcelona','Marseille','Genoa','Civitavecchia','Naples','Barcelona'], moments: ['Barcelona sail-away','Liguria coast','Naples evening'], cruise: { departurePort: 'barcelona', returnPort: 'barcelona', portsOfCall: ['Marseille','Genoa','Civitavecchia','Naples'], ship: { name: 'Curated cruise ship', indicative: true }, cabinClasses: ['Inside','Oceanview','Balcony'], sampleDepartures: [] } }),

  makeJourney({ id: 'nordic-capitals-by-air', type: 'air-journey', mode: 'air', title: 'Nordic Capitals by Air', subtitle: 'Copenhagen, Stockholm and Oslo in one clean northern arc.', country: 'Denmark / Sweden / Norway', region: 'Europe', duration: '8 days', bestMonths: [5,6,7,8,9], shoulderMonths: [4,10], feelings: ['city','slow','design'], editorialPriority: 89, route: ['Copenhagen','Stockholm','Oslo'], moments: ['Copenhagen harbour','Stockholm archipelago','Oslo waterfront'] }),
  makeJourney({ id: 'southeast-asia-air-loop', type: 'air-journey', mode: 'air', title: 'Southeast Asia Air Loop', subtitle: 'Three distinct city cultures connected by short regional flights.', country: 'Singapore / Thailand / Vietnam', region: 'Asia', duration: '10 days', bestMonths: [1,2,3,11,12], shoulderMonths: [4,10], feelings: ['city','food','hidden'], editorialPriority: 95, route: ['Singapore','Bangkok','Hanoi'], moments: ['Singapore night','Bangkok river','Hanoi old quarter'] }),
  makeJourney({ id: 'east-africa-safari-air', type: 'air-journey', mode: 'air', title: 'East Africa Safari Circuit', subtitle: 'Fly between iconic landscapes to spend more time in the wild.', country: 'Kenya / Tanzania', region: 'Africa', duration: '9 days', bestMonths: [6,7,8,9,10,1,2], shoulderMonths: [3,11,12], feelings: ['wild','luxury'], editorialPriority: 98, route: ['Nairobi','Masai Mara','Serengeti','Zanzibar'], moments: ['Mara dawn','Serengeti horizon','Zanzibar coast'] }),
  makeJourney({ id: 'south-america-icons-air', type: 'air-journey', mode: 'air', title: 'South America Icons by Air', subtitle: 'A high-energy arc across Rio, Buenos Aires and Santiago.', country: 'Brazil / Argentina / Chile', region: 'South America', duration: '11 days', bestMonths: [3,4,10,11], shoulderMonths: [2,5,9,12], feelings: ['city','romantic','food'], editorialPriority: 92, route: ['Rio de Janeiro','Buenos Aires','Santiago'], moments: ['Rio sunrise','Buenos Aires night','Andes arrival'] }),
  makeJourney({ id: 'middle-east-air-triangle', type: 'air-journey', mode: 'air', title: 'Dubai · Doha · Muscat', subtitle: 'Modern Gulf cities, desert landscapes and Arabian coast.', country: 'UAE / Qatar / Oman', region: 'Middle East', duration: '8 days', bestMonths: [1,2,3,11,12], shoulderMonths: [4,10], avoidMonths: [6,7,8], feelings: ['luxury','city','desert'], editorialPriority: 88, route: ['Dubai','Doha','Muscat'], moments: ['Dubai skyline','Doha museums','Muscat coast'] }),
];
