/**
 * Regenerate trademarks.json with proper related terms.
 *
 * Fixes the incorrect cleanup that removed important multi-word trademark phrases
 * like "Mickey Mouse", "Iron Man", "Lion King", etc.
 */

const fs = require('fs');
const path = require('path');
const englishWords = require('an-array-of-english-words');

const INPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'trademarks.json');
const OUTPUT_PATH = INPUT_PATH;

// Build dictionary set (lowercase)
const dictionary = new Set(englishWords.map(w => w.toLowerCase()));

// ─── MANDATORY RELATED TERMS PER BRAND ──────────────────────────────────────
// These are well-known character names, franchise names, and trademarked IP
// that MUST exist for each brand.

const MANDATORY_RELATED = {
  "Disney": [
    "Mickey Mouse", "Minnie Mouse", "Donald Duck", "Goofy", "Pluto", "Elsa",
    "Frozen", "Lion King", "Simba", "Toy Story", "Woody", "Buzz Lightyear",
    "Cinderella", "Moana", "Ariel", "Belle", "Rapunzel", "Mulan", "Aladdin",
    "Snow White", "Bambi", "Dumbo", "Stitch", "Tinker Bell", "Pocahontas",
    "Mufasa", "Nemo", "Finding Nemo", "Finding Dory", "Zootopia", "Encanto",
    "Mirabel", "Lilo and Stitch", "Maleficent", "Peter Pan", "Pinocchio",
    "Fantasia", "Sleeping Beauty", "Aurora", "Tiana", "Princess Jasmine",
    "Winnie the Pooh", "Tigger", "Eeyore", "Piglet"
  ],
  "Marvel": [
    "Avengers", "Iron Man", "Spider-Man", "Thor", "Hulk", "Captain America",
    "Black Panther", "Black Widow", "Wolverine", "Deadpool", "Thanos", "Groot",
    "Scarlet Witch", "Doctor Strange", "Loki", "Ant-Man", "Hawkeye",
    "Nick Fury", "War Machine", "Vision", "Falcon", "Winter Soldier",
    "Guardians of the Galaxy", "Gamora", "Drax", "Rocket Raccoon",
    "Captain Marvel", "Wakanda", "Vibranium", "Mjolnir", "Infinity Gauntlet"
  ],
  "DC Comics": [
    "Batman", "Superman", "Wonder Woman", "Flash", "Aquaman", "Joker",
    "Harley Quinn", "Green Lantern", "Robin", "Batgirl", "Catwoman",
    "Gotham", "Metropolis", "Justice League", "Batmobile", "Kryptonite",
    "Wayne Enterprises", "Arkham", "Lex Luthor", "Nightwing", "Supergirl",
    "Cyborg", "Shazam", "Green Arrow"
  ],
  "Star Wars": [
    "Luke Skywalker", "Darth Vader", "Yoda", "Baby Yoda", "Mandalorian",
    "Chewbacca", "R2-D2", "Boba Fett", "Lightsaber", "Han Solo",
    "Princess Leia", "Obi-Wan Kenobi", "Anakin Skywalker", "Palpatine",
    "Stormtrooper", "Millennium Falcon", "Death Star", "Jedi", "Sith",
    "Wookiee", "Ewok", "Grogu", "Kylo Ren", "Rey", "C-3PO",
    "Darth Maul", "Jabba the Hutt", "Lando Calrissian", "Padme Amidala"
  ],
  "Harry Potter": [
    "Hogwarts", "Gryffindor", "Slytherin", "Hufflepuff", "Ravenclaw",
    "Dumbledore", "Voldemort", "Quidditch", "Hermione", "Ron Weasley",
    "Severus Snape", "Draco Malfoy", "Hagrid", "Dobby", "Hedwig",
    "Horcrux", "Deathly Hallows", "Patronus", "Muggle", "Diagon Alley",
    "Ministry of Magic", "Butterbeer", "Nimbus", "Firebolt", "Azkaban",
    "Dementor", "Golden Snitch", "Marauders Map", "Sorting Hat",
    "Chamber of Secrets", "Philosopher Stone", "Goblet of Fire",
    "Order of the Phoenix", "Half Blood Prince"
  ],
  "Pokemon": [
    "Pikachu", "Charizard", "Bulbasaur", "Squirtle", "Eevee", "Mewtwo",
    "Pokeball", "Jigglypuff", "Snorlax", "Gengar", "Gyarados",
    "Dragonite", "Mew", "Lucario", "Greninja", "Garchomp",
    "Blastoise", "Venusaur", "Charmander", "Psyduck", "Togepi",
    "Magikarp", "Lapras", "Arcanine", "Alakazam", "Machamp"
  ],

  // ── Additional entertainment / character brands ──
  "Nintendo": [
    "Mario", "Luigi", "Princess Peach", "Bowser", "Yoshi", "Toad",
    "Donkey Kong", "Kirby", "Link", "Zelda", "Samus Aran", "Metroid",
    "Animal Crossing", "Fire Emblem", "Super Smash Bros", "Pikmin",
    "Mario Kart", "Wario", "Waluigi", "Rosalina", "Koopa Troopa"
  ],
  "Sanrio": [
    "Hello Kitty", "My Melody", "Cinnamoroll", "Kuromi", "Pompompurin",
    "Keroppi", "Badtz-Maru", "Little Twin Stars", "Gudetama",
    "Tuxedo Sam", "Pochacco", "Aggretsuko"
  ],
  "Sesame Street": [
    "Elmo", "Big Bird", "Cookie Monster", "Oscar the Grouch", "Bert and Ernie",
    "Grover", "Count von Count", "Abby Cadabby", "Snuffleupagus"
  ],
  "Peppa Pig": [
    "Peppa Pig", "George Pig", "Daddy Pig", "Mummy Pig", "Grandpa Pig",
    "Suzy Sheep", "Danny Dog", "Pedro Pony", "Rebecca Rabbit"
  ],
  "Paw Patrol": [
    "Chase", "Marshall", "Skye", "Rocky", "Rubble", "Zuma",
    "Ryder", "Adventure Bay", "Paw Patrol Tower"
  ],
  "SpongeBob": [
    "SpongeBob SquarePants", "Patrick Star", "Squidward", "Sandy Cheeks",
    "Mr Krabs", "Bikini Bottom", "Krabby Patty", "Gary the Snail",
    "Plankton", "Larry the Lobster"
  ],
  "Bluey": [
    "Bluey Heeler", "Bingo Heeler", "Bandit Heeler", "Chilli Heeler",
    "Muffin", "Stripe", "Uncle Rad"
  ],
  "Barbie": [
    "Barbie Dreamhouse", "Ken Doll", "Malibu Barbie", "Barbie Girl",
    "Skipper", "Stacie", "Chelsea"
  ],
  "Transformers": [
    "Optimus Prime", "Bumblebee", "Megatron", "Starscream", "Autobot",
    "Decepticon", "Cybertron", "Energon", "Soundwave", "Grimlock"
  ],
  "Teenage Mutant Ninja Turtles": [
    "Leonardo", "Donatello", "Raphael", "Michelangelo", "Splinter",
    "Shredder", "Krang", "April O'Neil", "Foot Clan", "Turtle Power"
  ],
  "Looney Tunes": [
    "Bugs Bunny", "Daffy Duck", "Tweety Bird", "Sylvester the Cat",
    "Wile E Coyote", "Road Runner", "Porky Pig", "Elmer Fudd",
    "Yosemite Sam", "Tasmanian Devil", "Marvin the Martian", "Foghorn Leghorn"
  ],
  "Tom and Jerry": [
    "Tom Cat", "Jerry Mouse", "Spike the Bulldog", "Tyke the Puppy",
    "Tom and Jerry", "Nibbles"
  ],
  "Scooby-Doo": [
    "Scooby Doo", "Shaggy Rogers", "Velma Dinkley", "Daphne Blake",
    "Fred Jones", "Mystery Machine", "Mystery Inc", "Scrappy Doo"
  ],
  "Care Bears": [
    "Tenderheart Bear", "Cheer Bear", "Grumpy Bear", "Funshine Bear",
    "Love-a-Lot Bear", "Good Luck Bear", "Bedtime Bear", "Care Bear Stare"
  ],
  "My Little Pony": [
    "Twilight Sparkle", "Rainbow Dash", "Pinkie Pie", "Fluttershy",
    "Applejack", "Rarity", "Equestria", "Canterlot", "Friendship Is Magic",
    "Princess Celestia", "Princess Luna", "Spike the Dragon"
  ],
  "Sonic the Hedgehog": [
    "Sonic", "Tails", "Knuckles", "Shadow the Hedgehog", "Amy Rose",
    "Doctor Eggman", "Robotnik", "Chaos Emerald", "Super Sonic", "Metal Sonic"
  ],
  "Dragon Ball": [
    "Goku", "Vegeta", "Piccolo", "Gohan", "Frieza", "Cell", "Buu",
    "Super Saiyan", "Kamehameha", "Dragon Balls", "Krillin", "Trunks",
    "Bulma", "Shenron", "Capsule Corp"
  ],
  "Naruto": [
    "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake",
    "Itachi Uchiha", "Hinata Hyuga", "Akatsuki", "Sharingan", "Konoha",
    "Nine Tails", "Hokage", "Rasengan", "Kunai", "Boruto"
  ],
  "One Piece": [
    "Monkey D Luffy", "Roronoa Zoro", "Straw Hat", "Nami", "Sanji",
    "Chopper", "Robin", "Franky", "Brook", "Jinbe", "Going Merry",
    "Thousand Sunny", "Grand Line", "Devil Fruit", "Shanks"
  ],
  "Studio Ghibli": [
    "Totoro", "My Neighbor Totoro", "Spirited Away", "No-Face", "Chihiro",
    "Howl Moving Castle", "Princess Mononoke", "Ponyo", "Kiki Delivery Service",
    "Catbus", "Calcifer", "Jiji", "Kodama", "Nausicaa", "Laputa",
    "Castle in the Sky"
  ],
  "Attack on Titan": [
    "Eren Yeager", "Mikasa Ackerman", "Levi Ackerman", "Survey Corps",
    "Colossal Titan", "Armored Titan", "Attack Titan", "Wall Maria",
    "Titan Shifter", "ODM Gear", "Scouts Regiment"
  ],
  "Demon Slayer": [
    "Tanjiro Kamado", "Nezuko Kamado", "Zenitsu Agatsuma", "Inosuke Hashibira",
    "Muzan Kibutsuji", "Hashira", "Demon Slayer Corps", "Breathing Style",
    "Hinokami Kagura", "Nichirin Blade"
  ],
  "Jujutsu Kaisen": [
    "Yuji Itadori", "Megumi Fushiguro", "Nobara Kugisaki", "Satoru Gojo",
    "Sukuna", "Cursed Energy", "Domain Expansion", "Jujutsu High",
    "Toge Inumaki", "Ryomen Sukuna"
  ],
  "Taylor Swift": [
    "Swiftie", "Eras Tour", "Midnights", "Folklore", "Evermore",
    "Reputation", "Red Album", "1989 Album", "Lover Album", "Fearless",
    "Speak Now", "Taylor Nation", "Cruel Summer", "Anti-Hero"
  ],
  "BTS": [
    "Bangtan Boys", "BT21", "Army", "Jungkook", "Jimin", "V Taehyung",
    "Suga", "RM Namjoon", "Jin Seokjin", "J-Hope Hoseok",
    "Dynamite", "Butter", "Boy With Luv"
  ],
  "The Beatles": [
    "John Lennon", "Paul McCartney", "George Harrison", "Ringo Starr",
    "Abbey Road", "Yellow Submarine", "Sgt Peppers", "Let It Be",
    "Fab Four", "Liverpool", "Strawberry Fields"
  ],
  "Grateful Dead": [
    "Grateful Dead", "Steal Your Face", "Dancing Bears", "Jerry Garcia",
    "Deadhead", "Terrapin Station", "Skull and Roses",
    "Touch of Grey", "Casey Jones"
  ],
  "Rolling Stones": [
    "Mick Jagger", "Keith Richards", "Hot Lips Logo", "Tongue Logo",
    "Satisfaction", "Paint It Black", "Sticky Fingers"
  ],
  "WWE": [
    "John Cena", "The Rock", "Stone Cold", "Undertaker", "Hulk Hogan",
    "WrestleMania", "Raw", "SmackDown", "Roman Reigns", "Seth Rollins",
    "Becky Lynch", "Triple H", "Randy Orton"
  ],
  "NFL": [
    "Super Bowl", "Dallas Cowboys", "Green Bay Packers", "New England Patriots",
    "San Francisco 49ers", "Pittsburgh Steelers", "Kansas City Chiefs",
    "National Football League", "Monday Night Football"
  ],
  "NBA": [
    "Los Angeles Lakers", "Chicago Bulls", "Golden State Warriors",
    "Boston Celtics", "Miami Heat", "Brooklyn Nets", "National Basketball Association"
  ],
  "MLB": [
    "New York Yankees", "Boston Red Sox", "Los Angeles Dodgers",
    "Chicago Cubs", "World Series", "Major League Baseball"
  ],
  "FIFA": [
    "World Cup", "Champions League", "Premier League"
  ],
  "Hello Kitty": [
    "Hello Kitty", "Dear Daniel", "Kitty White", "Sanrio Characters"
  ],
  "Minecraft": [
    "Creeper", "Enderman", "Steve", "Alex", "Ender Dragon",
    "Minecraft", "Nether Portal", "Redstone", "Diamond Pickaxe",
    "Crafting Table", "Herobrine"
  ],
  "Roblox": [
    "Robux", "Roblox", "Builderman", "Adopt Me", "Blox Fruits",
    "Tower of Hell", "Brookhaven"
  ],
  "Fortnite": [
    "Battle Royale", "Victory Royale", "Fortnite", "V-Bucks",
    "Tilted Towers", "Battle Bus", "Loot Llama", "Peely"
  ],
  "Among Us": [
    "Impostor", "Crewmate", "Among Us", "Emergency Meeting",
    "Sus", "Electrical Task"
  ],
  "Lord of the Rings": [
    "Frodo Baggins", "Gandalf", "Aragorn", "Legolas", "Gimli",
    "Sauron", "One Ring", "Gollum", "Mordor", "Hobbit",
    "Shire", "Middle Earth", "Rivendell", "Rohan", "Gondor",
    "Samwise Gamgee", "Mount Doom", "Minas Tirith", "Nazgul", "Balrog"
  ],
  "Game of Thrones": [
    "Iron Throne", "Daenerys Targaryen", "Jon Snow", "Cersei Lannister",
    "Tyrion Lannister", "Arya Stark", "Sansa Stark", "White Walker",
    "Night King", "Winterfell", "Kings Landing", "Westeros",
    "House Stark", "House Lannister", "House Targaryen", "Dothraki",
    "Dragon Glass", "Valyrian Steel", "Winter Is Coming"
  ],
  "Stranger Things": [
    "Eleven", "Hawkins", "Upside Down", "Demogorgon", "Dustin Henderson",
    "Mike Wheeler", "Will Byers", "Lucas Sinclair", "Steve Harrington",
    "Vecna", "Mind Flayer", "Hellfire Club"
  ],
  "The Simpsons": [
    "Homer Simpson", "Bart Simpson", "Marge Simpson", "Lisa Simpson",
    "Maggie Simpson", "Springfield", "Krusty the Clown", "Mr Burns",
    "Ned Flanders", "Moe Szyslak", "Duff Beer", "Kwik-E-Mart"
  ],
  "Family Guy": [
    "Peter Griffin", "Stewie Griffin", "Brian Griffin", "Lois Griffin",
    "Chris Griffin", "Meg Griffin", "Quahog", "Glenn Quagmire",
    "Cleveland Brown", "Joe Swanson"
  ],
  "Rick and Morty": [
    "Rick Sanchez", "Morty Smith", "Pickle Rick", "Portal Gun",
    "Meeseeks", "Squanchy", "Birdperson", "Evil Morty",
    "Schwifty", "Plumbus", "Interdimensional Cable"
  ],
  "South Park": [
    "Eric Cartman", "Stan Marsh", "Kyle Broflovski", "Kenny McCormick",
    "Butters Stotch", "Randy Marsh", "Mr Garrison", "Chef"
  ],
  "Bob the Builder": [
    "Bob the Builder", "Wendy", "Scoop", "Muck", "Dizzy", "Roley",
    "Lofty", "Pilchard", "Can We Fix It"
  ],
  "Dora the Explorer": [
    "Dora the Explorer", "Boots", "Swiper", "Backpack", "Map",
    "Swiper No Swiping", "Diego"
  ],
  "Cocomelon": [
    "Cocomelon", "JJ", "Baby JJ", "TomTom", "YoYo",
    "Cocomelon Nursery Rhymes"
  ],
  "Baby Shark": [
    "Baby Shark", "Daddy Shark", "Mommy Shark", "Grandpa Shark",
    "Grandma Shark", "Pinkfong", "Baby Shark Doo Doo"
  ],
  "Power Rangers": [
    "Power Rangers", "Morphin Time", "Megazord", "Red Ranger",
    "Blue Ranger", "Pink Ranger", "Green Ranger", "White Ranger",
    "Zordon", "Rita Repulsa", "Lord Zedd"
  ],
  "LEGO": [
    "Minifigure", "Legoland", "Duplo", "Bionicle", "Ninjago",
    "LEGO City", "LEGO Friends", "LEGO Star Wars", "LEGO Technic",
    "Brick Separator"
  ],
  "Hot Wheels": [
    "Hot Wheels", "Matchbox", "Monster Trucks", "Track Builder",
    "Hot Wheels City"
  ],
  "Nerf": [
    "Nerf Gun", "Nerf Blaster", "Nerf Elite", "Nerf Mega",
    "Nerf Ultra", "Nerf Rival"
  ],
  "Coca-Cola": [
    "Coca Cola", "Coke", "Diet Coke", "Coca-Cola Classic",
    "Polar Bear", "Share a Coke"
  ],
  "Nike": [
    "Just Do It", "Air Jordan", "Air Max", "Nike Swoosh",
    "Nike Dunk", "Air Force One"
  ],
  "Adidas": [
    "Three Stripes", "Adidas Originals", "Superstar", "Stan Smith",
    "Yeezy", "Ultraboost", "Trefoil Logo"
  ],
  "Louis Vuitton": [
    "Louis Vuitton", "LV Monogram", "Neverfull", "Speedy",
    "Damier", "Alma", "Keepall"
  ],
  "Gucci": [
    "Gucci", "GG Logo", "Gucci Belt", "Interlocking G",
    "Gucci Flora", "Gucci Ace"
  ],
  "Chanel": [
    "Chanel", "CC Logo", "Chanel No 5", "Boy Bag",
    "Classic Flap", "Coco Chanel", "Tweed Jacket"
  ],
  "Hermes": [
    "Hermes", "Birkin Bag", "Kelly Bag", "Hermes Scarf",
    "Hermes Belt", "Orange Box"
  ],
  "Supreme": [
    "Supreme", "Box Logo", "Supreme Bogo"
  ],
  "Ferrari": [
    "Ferrari", "Prancing Horse", "Scuderia Ferrari", "Cavallino Rampante",
    "Enzo Ferrari", "Testarossa", "LaFerrari"
  ],
  "Lamborghini": [
    "Lamborghini", "Raging Bull", "Aventador", "Huracan",
    "Countach", "Gallardo", "Urus"
  ],
  "Tesla": [
    "Tesla", "Cybertruck", "Model S", "Model X",
    "Autopilot", "Supercharger", "Gigafactory"
  ],
  "Harley-Davidson": [
    "Harley Davidson", "Sportster", "Softail", "Road King",
    "Street Glide", "Fat Boy", "Iron 883", "Bar and Shield"
  ],
  "John Deere": [
    "John Deere", "Nothing Runs Like a Deere", "Leaping Deer",
    "Green Tractor"
  ],
  "Caterpillar": [
    "Caterpillar", "CAT", "Cat Boots", "Cat Equipment"
  ],
  "Apple": [
    "iPhone", "iPad", "MacBook", "Apple Watch", "AirPods",
    "iMac", "Apple Logo", "Siri", "iOS", "macOS"
  ],
  "Google": [
    "Gmail", "Google Maps", "Chrome", "Android",
    "YouTube", "Google Pixel", "Google Assistant"
  ],
  "Microsoft": [
    "Windows", "Xbox", "Surface", "Office",
    "Cortana", "Azure", "Outlook"
  ],
  "Amazon": [
    "Alexa", "Prime", "Kindle", "Fire Stick",
    "Echo Dot", "AWS"
  ],
  "Starbucks": [
    "Starbucks", "Frappuccino", "Starbucks Siren",
    "Venti", "Grande", "Pike Place"
  ],
  "Jack Daniel's": [
    "Jack Daniels", "Old No 7", "Tennessee Whiskey",
    "Gentleman Jack", "Single Barrel"
  ],
  "Budweiser": [
    "Budweiser", "Bud Light", "Clydesdales",
    "King of Beers"
  ],
  "Red Bull": [
    "Red Bull", "Red Bull Racing", "Gives You Wings"
  ],
  "Monster Energy": [
    "Monster Energy", "Monster Claw", "Monster Logo"
  ],
  "Playboy": [
    "Playboy", "Playboy Bunny", "Rabbit Head Logo",
    "Playmate"
  ],
  "Pixar": [
    "Buzz Lightyear", "Woody", "Toy Story", "Monsters Inc",
    "Mike Wazowski", "Sully", "Cars", "Lightning McQueen",
    "Mater", "Finding Nemo", "Dory", "Ratatouille",
    "Wall-E", "Up", "Inside Out", "Coco", "Soul",
    "Nemo", "Incredibles", "Mr Incredible", "Elastigirl"
  ],
  "Jurassic Park": [
    "Jurassic Park", "Jurassic World", "T-Rex", "Velociraptor",
    "Indominus Rex", "Blue the Raptor", "Isla Nublar",
    "InGen", "Dinosaur Park"
  ],
  "Ghostbusters": [
    "Ghostbusters", "Proton Pack", "Stay Puft Marshmallow Man",
    "Slimer", "Ecto-1", "Who You Gonna Call", "Ghost Trap"
  ],
  "Back to the Future": [
    "DeLorean", "Flux Capacitor", "McFly", "Doc Brown",
    "Hoverboard", "Hill Valley", "Time Machine"
  ],
  "Frozen": [
    "Elsa", "Anna", "Olaf", "Sven", "Kristoff",
    "Let It Go", "Arendelle", "Ice Queen"
  ],
  "The Mandalorian": [
    "Mandalorian", "Baby Yoda", "Grogu", "Din Djarin",
    "Beskar", "This Is the Way", "Mando"
  ],
  "Winnie the Pooh": [
    "Winnie the Pooh", "Piglet", "Tigger", "Eeyore",
    "Christopher Robin", "Hundred Acre Wood", "Pooh Bear"
  ],
  "Curious George": [
    "Curious George", "Man with the Yellow Hat"
  ],
  "The Very Hungry Caterpillar": [
    "Very Hungry Caterpillar", "Eric Carle"
  ],
  "Rugrats": [
    "Tommy Pickles", "Chuckie Finster", "Angelica Pickles",
    "Reptar", "Phil and Lil"
  ],
  "Garfield": [
    "Garfield", "Odie", "Jon Arbuckle", "Nermal",
    "Lasagna Cat"
  ],
  "Snoopy": [
    "Snoopy", "Charlie Brown", "Woodstock", "Peanuts",
    "Lucy van Pelt", "Linus van Pelt", "Good Grief",
    "Red Baron", "Great Pumpkin", "Flying Ace"
  ],
  "Dr. Seuss": [
    "Cat in the Hat", "Green Eggs and Ham", "Grinch",
    "Horton", "Lorax", "Thing One", "Thing Two",
    "Sam I Am", "Oh the Places", "One Fish Two Fish"
  ],
  "Felix the Cat": [
    "Felix the Cat", "Magic Bag"
  ],
  "Betty Boop": [
    "Betty Boop", "Boop Oop a Doop"
  ],
  "Pac-Man": [
    "Pac-Man", "Ms Pac-Man", "Ghost Gang",
    "Blinky", "Pinky", "Inky", "Clyde"
  ],
  "Tetris": [
    "Tetris", "Tetromino"
  ],
  "Dungeons & Dragons": [
    "Dungeons and Dragons", "D&D", "Dungeon Master",
    "Mind Flayer", "Beholder", "Owlbear", "Gelatinous Cube"
  ],
  "Magic: The Gathering": [
    "Magic the Gathering", "Planeswalker", "Black Lotus",
    "Mana", "MTG"
  ],
  "Monopoly": [
    "Monopoly", "Mr Monopoly", "Rich Uncle Pennybags",
    "Boardwalk", "Park Place", "Go to Jail",
    "Community Chest", "Get Out of Jail Free"
  ]
};


// ─── CLEANUP LOGIC ──────────────────────────────────────────────────────────

/**
 * Determine if a single word passes the filter.
 * - Words <= 2 chars: remove
 * - Pure numbers: remove
 * - Single words < 6 chars: remove if in English dictionary
 * - Single words 6+ chars: keep if NOT in English dictionary
 */
function singleWordPassesFilter(word) {
  const w = word.trim();
  if (w.length <= 2) return false;
  if (/^\d+$/.test(w)) return false;
  const lower = w.toLowerCase();
  if (w.length < 6) {
    // Short single words: remove if dictionary word
    return !dictionary.has(lower);
  } else {
    // 6+ char single words: keep if NOT in dictionary
    return !dictionary.has(lower);
  }
}

/**
 * Check if a word is a common English word.
 */
function isCommonWord(word) {
  return dictionary.has(word.toLowerCase());
}

/**
 * Determine if a term should be kept after cleanup.
 * Multi-word phrases (2+ words) are ALWAYS kept.
 * Single words go through the filter.
 */
function shouldKeepTerm(term) {
  const t = term.trim();
  if (!t) return false;

  // Count significant words (ignore very short joining words for word count)
  const words = t.split(/[\s-]+/).filter(w => w.length > 0);

  if (words.length >= 2) {
    // Multi-word phrases: ALWAYS keep
    return true;
  }

  // Single word
  return singleWordPassesFilter(t);
}

/**
 * Compute tier for a related term.
 *
 * Tier 1: Multi-word phrase where ALL significant words (4+ chars) are NOT in English dictionary
 * Tier 2: Single word NOT in dictionary, OR multi-word where SOME words are distinctive
 * Tier 3: All significant words are common English (but kept because multi-word = trademark reference)
 *
 * Single-word terms that pass filter (6+ chars, not in dictionary): always Tier 2
 */
function computeTier(term) {
  const t = term.trim();
  const words = t.split(/[\s-]+/).filter(w => w.length > 0);

  if (words.length === 1) {
    // Single word that passed filter = Tier 2
    return 2;
  }

  // Multi-word: check significant words (4+ chars, not articles/prepositions)
  const stopWords = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'is', 'with', 'no', 'or']);
  const significantWords = words.filter(w => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  if (significantWords.length === 0) {
    // All words are short/stop words - check all words
    const allNonStop = words.filter(w => !stopWords.has(w.toLowerCase()));
    if (allNonStop.length === 0) return 3;
    const distinctiveCount = allNonStop.filter(w => !isCommonWord(w)).length;
    if (distinctiveCount === allNonStop.length) return 1;
    if (distinctiveCount > 0) return 2;
    return 3;
  }

  const distinctiveCount = significantWords.filter(w => !isCommonWord(w)).length;

  if (distinctiveCount === significantWords.length) {
    // ALL significant words are NOT in dictionary -> Tier 1
    return 1;
  } else if (distinctiveCount > 0) {
    // SOME significant words are distinctive -> Tier 2
    return 2;
  } else {
    // All significant words are common English -> Tier 3
    return 3;
  }
}


// ─── MAIN ────────────────────────────────────────────────────────────────────

function main() {
  // Read current data
  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8'));

  console.log(`Read ${data.brands.length} brands from trademarks.json`);

  let totalTermsBefore = 0;
  data.brands.forEach(b => { totalTermsBefore += (b.related || []).length; });
  console.log(`Total related terms before: ${totalTermsBefore}`);

  // Build a global set of all mandatory terms (these bypass dictionary filter)
  const allMandatoryTerms = new Set();
  for (const terms of Object.values(MANDATORY_RELATED)) {
    terms.forEach(t => allMandatoryTerms.add(t.toLowerCase().trim()));
  }

  // Process each brand
  data.brands.forEach(brand => {
    // Collect existing related term strings
    const existingTerms = new Set(
      (brand.related || []).map(r => typeof r === 'string' ? r : r.t)
    );

    // Add mandatory terms if this brand has them
    const mandatory = MANDATORY_RELATED[brand.name];
    const mandatorySet = new Set();
    if (mandatory) {
      mandatory.forEach(term => {
        existingTerms.add(term);
        mandatorySet.add(term.toLowerCase().trim());
      });
    }

    // Apply cleanup and tier computation
    const cleanedRelated = [];
    const seen = new Set(); // dedupe (case-insensitive)

    for (const term of existingTerms) {
      const normalizedKey = term.toLowerCase().trim();
      if (seen.has(normalizedKey)) continue;

      // Mandatory terms ALWAYS pass (they are curated IP terms),
      // except truly degenerate ones (pure numbers, <=2 chars)
      const isMandatory = mandatorySet.has(normalizedKey);
      const isDegenerate = normalizedKey.length <= 2 || /^\d+$/.test(normalizedKey);
      if ((isMandatory && !isDegenerate) || shouldKeepTerm(term)) {
        seen.add(normalizedKey);
        const tier = computeTier(term);
        cleanedRelated.push({ t: term, r: tier });
      }
    }

    // Sort: Tier 1 first, then Tier 2, then Tier 3; alphabetical within tier
    cleanedRelated.sort((a, b) => {
      if (a.r !== b.r) return a.r - b.r;
      return a.t.localeCompare(b.t);
    });

    brand.related = cleanedRelated;
  });

  // Compute stats
  let totalTerms = 0;
  let tier1 = 0, tier2 = 0, tier3 = 0;
  data.brands.forEach(b => {
    b.related.forEach(r => {
      totalTerms++;
      if (r.r === 1) tier1++;
      else if (r.r === 2) tier2++;
      else if (r.r === 3) tier3++;
    });
  });

  console.log(`\n--- RESULTS ---`);
  console.log(`Total brands: ${data.brands.length}`);
  console.log(`Total related terms: ${totalTerms}`);
  console.log(`  Tier 1 (all distinctive words): ${tier1}`);
  console.log(`  Tier 2 (some distinctive): ${tier2}`);
  console.log(`  Tier 3 (common English phrase): ${tier3}`);

  // Show key brands
  const keyBrands = ['Disney', 'Marvel', 'DC Comics', 'Star Wars', 'Harry Potter', 'Pokemon'];
  console.log(`\n--- KEY BRANDS ---`);
  keyBrands.forEach(name => {
    const b = data.brands.find(x => x.name === name);
    if (b) {
      console.log(`${name} (${b.related.length} terms): ${b.related.map(r => `${r.t}[T${r.r}]`).join(', ')}`);
    }
  });

  // Write output
  const jsonStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(OUTPUT_PATH, jsonStr, 'utf-8');

  const stats = fs.statSync(OUTPUT_PATH);
  console.log(`\nFile written: ${OUTPUT_PATH}`);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`);
}

main();
