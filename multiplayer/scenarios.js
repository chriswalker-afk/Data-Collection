// Audited Edexcel 9MA0 scenarios, projected from content/scenarios.json.
// Keep synchronized with Solo; tests/multiplayer.test.mjs checks parity.
export const SCENARIOS = [
  {
    "id": "sr-01",
    "correctMethod": "simple-random",
    "prompt": "Every eligible student is numbered from 1 to 400. A generator picks 30 distinct integers from 1 to 400, and those students are chosen.",
    "reason": "The pupils are chosen by a random-number procedure from one complete frame.",
    "contrast": "It is not stratified: there is no division into groups."
  },
  {
    "id": "sr-02",
    "correctMethod": "simple-random",
    "prompt": "A factory numbers all 800 lightbulbs in a batch and uses an unbiased random selection tool to choose 40 distinct numbered bulbs.",
    "reason": "Every possible group of 40 has the same selection chance under the described procedure.",
    "contrast": "There is no fixed interval, so it is not systematic."
  },
  {
    "id": "sr-03",
    "correctMethod": "simple-random",
    "prompt": "Tickets numbered 1 to 60, one for each club member, are mixed thoroughly. Ten are drawn without replacement.",
    "reason": "Drawing without replacement makes each possible set of 10 equally likely.",
    "contrast": "The members are not selected for being conveniently available."
  },
  {
    "id": "sr-04",
    "correctMethod": "simple-random",
    "prompt": "A complete list of 150 pupils is numbered; a random-digit table is read, discarding values above 150 and any repeated number until 20 pupils are selected.",
    "reason": "Valid distinct numbers from a complete frame are chosen at random.",
    "contrast": "This is not systematic because no regular list interval is followed."
  },
  {
    "id": "sys-01",
    "correctMethod": "systematic",
    "prompt": "From a list of 200 students, a researcher randomly starts at position 4 and then selects 4, 14, 24, ... until 20 are selected.",
    "reason": "After a random start, positions are selected at a fixed interval of 10.",
    "contrast": "It is not a simple random sample: only certain combinations of 20 can be produced."
  },
  {
    "id": "sys-02",
    "correctMethod": "systematic",
    "prompt": "A quality inspector chooses a random starting item among the first 25 in an ordered production list, then inspects every 25th item.",
    "reason": "The process uses a random start and a regular interval.",
    "contrast": "The selection is not based on current convenience."
  },
  {
    "id": "sys-03",
    "correctMethod": "systematic",
    "prompt": "To choose 50 from 500 numbered records, a computer selects a starting number from 1 to 10 and then chooses every 10th record.",
    "reason": "The interval is 500/50 = 10; the start is random.",
    "contrast": "This is not stratified: no subgroups are sampled separately."
  },
  {
    "id": "sys-04",
    "correctMethod": "systematic",
    "prompt": "For 50 from 498 records, the researcher randomly chooses a start from positions 1 to 8 and then takes every 10th record thereafter.",
    "reason": "A random starting point is followed by systematic selection even though N/n is non-integer.",
    "contrast": "Do not require exact divisibility of N by n."
  },
  {
    "id": "st-01",
    "correctMethod": "stratified",
    "prompt": "A college has 300 Year 12 and 200 Year 13 pupils. It chooses 30 Year 12 and 20 Year 13 pupils at random from separate registers.",
    "reason": "The numbers are proportional to group sizes and selection is random in each stratum.",
    "contrast": "Not quota: the selection inside each group is random."
  },
  {
    "id": "st-02",
    "correctMethod": "stratified",
    "prompt": "A company lists every employee by department. It allocates 10% of each department to the sample and randomly draws names within each department.",
    "reason": "The population is partitioned by department and sampled randomly within each group.",
    "contrast": "Setting percentages alone would not distinguish this from quota."
  },
  {
    "id": "st-03",
    "correctMethod": "stratified",
    "prompt": "A survey takes 40% of its sample from urban schools and 60% from rural schools to match the population, with random-number selection from the full roster in each group.",
    "reason": "Separate random selections are performed within the urban and rural strata.",
    "contrast": "Not opportunity: nobody is chosen just for being available."
  },
  {
    "id": "st-04",
    "correctMethod": "stratified",
    "prompt": "A museum has records for adults and children. It draws 18 adult and 12 child ticket holders using separate random-number lists matching visitor proportions.",
    "reason": "Random selection occurs within clearly defined groups.",
    "contrast": "Not simple random across the whole undivided population."
  },
  {
    "id": "qu-01",
    "correctMethod": "quota",
    "prompt": "An interviewer needs 25 adults under 30 and 25 adults aged 30 or above. They approach passers-by and stop asking in each group once 25 have agreed.",
    "reason": "Group quotas are set, and people are recruited non-randomly until each quota is filled.",
    "contrast": "Not stratified: no random selection is made within groups."
  },
  {
    "id": "qu-02",
    "correctMethod": "quota",
    "prompt": "A research company is told to collect 60 responses from commuters and 40 from non-commuters; staff recruit volunteers until each target is reached.",
    "reason": "Predefined category totals govern recruitment.",
    "contrast": "Not opportunity alone: the explicit quotas control recruitment."
  },
  {
    "id": "qu-03",
    "correctMethod": "quota",
    "prompt": "For a school poll, 20 responses from each year group are required. Interviewers recruit willing pupils they encounter until each target is reached.",
    "reason": "Interviewers fill set numbers for groups without random-number selection.",
    "contrast": "There is no sampling frame used to select respondents."
  },
  {
    "id": "qu-04",
    "correctMethod": "quota",
    "prompt": "A charity sets targets of 30 local residents and 20 visitors. Street interviewers approach available people, identify the group and refuse further responses from a filled group.",
    "reason": "The target numbers per group make the method quota sampling.",
    "contrast": "Although people are approached conveniently, the explicit stopping rules by group are decisive."
  },
  {
    "id": "op-01",
    "correctMethod": "opportunity",
    "prompt": "A student surveys the first 20 eligible people leaving the library at lunchtime.",
    "reason": "People are chosen because they are available at that place and time.",
    "contrast": "There are no separate subgroup targets."
  },
  {
    "id": "op-02",
    "correctMethod": "opportunity",
    "prompt": "To study lunch choices, a researcher asks willing people seated near the canteen entrance during the first break.",
    "reason": "The researcher approaches people conveniently accessible at the study location.",
    "contrast": "Not simple random: no chance-based selection is described."
  },
  {
    "id": "op-03",
    "correctMethod": "opportunity",
    "prompt": "A shop manager asks the first 30 customers willing to answer questions after opening on Monday.",
    "reason": "Available shoppers are recruited without a random method or quotas.",
    "contrast": "The timing could bias the result."
  },
  {
    "id": "op-04",
    "correctMethod": "opportunity",
    "prompt": "A student asks whoever happens to be at the bus stop at 7:30 a.m. about transport habits, continuing until 15 people respond.",
    "reason": "The sample is made up of accessible eligible people at one location and time.",
    "contrast": "No group targets are set, so this is not quota."
  },
  {
    "id": "sr-05",
    "correctMethod": "simple-random",
    "prompt": "A wildlife team has a complete register of 240 tagged turtles. They assign each turtle a number and use a generator to select 24 different numbers, rejecting duplicates.",
    "reason": "A random-number selection of distinct labels from a complete turtle register is a simple random sample; every 24-turtle subset is equally likely under a correctly implemented draw.",
    "contrast": "Unlike systematic sampling, there is no fixed skip through an ordered turtle list."
  },
  {
    "id": "sr-06",
    "correctMethod": "simple-random",
    "prompt": "To check a shipment of 600 sealed jars, an inspector prints 600 identical slips, thoroughly mixes them and draws 30 slips without replacement.",
    "reason": "Physical draws from equally mixed slips without replacement give each set of 30 jars an equal chance.",
    "contrast": "No quotas for jar categories are being filled; the selection is wholly random."
  },
  {
    "id": "sr-07",
    "correctMethod": "simple-random",
    "prompt": "Researchers have an alphabetical list of 950 customers. A computer picks 45 unique list positions using a random integer function, and those records are invited to a survey.",
    "reason": "The computer generates distinct, equally likely positions from one complete customer frame.",
    "contrast": "Alphabetical ordering does not make this systematic: there is no fixed interval."
  },
  {
    "id": "sr-08",
    "correctMethod": "simple-random",
    "prompt": "A librarian numbers all 120 books returned today and uses a fair random-number app restricted to 1–120 until 12 different numbers have been drawn.",
    "reason": "A constrained fair generator and distinct labels select a simple random sample without replacement.",
    "contrast": "There is no need to discard out-of-range values from a generator already restricted to 1–120."
  },
  {
    "id": "sr-09",
    "correctMethod": "simple-random",
    "prompt": "For a school survey, all 480 eligible pupils are on a numbered register. The researcher uses a random-digit table, discards 000, values above 480 and repeated labels, then keeps the first 40 valid different labels.",
    "reason": "The unrestricted digit source is filtered to unique valid pupil labels; each valid subset of 40 has the intended equal chance.",
    "contrast": "Discarding invalid labels is a feature of this digit-table procedure, not evidence of fixed-interval selection."
  },
  {
    "id": "sr-10",
    "correctMethod": "simple-random",
    "prompt": "Every employee at a workplace is assigned one of 275 unique IDs. A correctly configured lottery selects 25 IDs without replacement; no department totals are specified.",
    "reason": "A lottery of distinct employee IDs from the complete population implements a single simple random draw.",
    "contrast": "Without separate departmental draws, this is not stratified even if the workforce contains departments."
  },
  {
    "id": "sys-05",
    "correctMethod": "systematic",
    "prompt": "An archive contains 720 ordered files. An analyst chooses a random starting position from 1 to 12, then takes that file and every 12th file to obtain 60.",
    "reason": "The fixed interval 720 ÷ 60 = 12 follows one random start.",
    "contrast": "The sample is not simple random because only certain 60-file subsets can occur."
  },
  {
    "id": "sys-06",
    "correctMethod": "systematic",
    "prompt": "A fish farm wants to check water at 15 of 300 evenly spaced monitoring points in a numbered route. After randomly choosing one of positions 1–20, the inspector visits that point and every 20th point.",
    "reason": "The random start and constant interval of 20 define a systematic sample along the route.",
    "contrast": "Following a route is not opportunity sampling when the points are selected by a fixed rule."
  },
  {
    "id": "sys-07",
    "correctMethod": "systematic",
    "prompt": "An auditor arranges 480 invoices by date, uses a generator to pick one of the first eight positions, and then selects every eighth invoice for a 60-invoice check.",
    "reason": "A random start is followed by a fixed gap of eight invoices; 480/60 = 8.",
    "contrast": "No separate random choice is made for each invoice after the first."
  },
  {
    "id": "sys-08",
    "correctMethod": "systematic",
    "prompt": "In a queue of 420 factory items, a technician selects a random start from 1–14 and then inspects that item and every fourteenth item until 30 have been checked.",
    "reason": "The technician uses a single chance-based start and a regular selection interval.",
    "contrast": "The selection rule does not define target quotas for different item types."
  },
  {
    "id": "sys-09",
    "correctMethod": "systematic",
    "prompt": "To inspect 40 of 197 sequential records, a researcher randomly chooses a start of 1 or 2, then selects every fifth record, keeping 40 positions within the list.",
    "reason": "A valid random start and fixed step of five yield 40 positions despite 197/40 not being an integer.",
    "contrast": "A non-integer population-to-sample ratio does not by itself rule out systematic sampling."
  },
  {
    "id": "sys-10",
    "correctMethod": "systematic",
    "prompt": "An orchard worker numbers 600 trees along ordered rows, randomly chooses one of positions 1–15, and samples every fifteenth tree along the resulting numbered sequence.",
    "reason": "One random starting position is followed by constant-distance selection in the ordered tree list.",
    "contrast": "Regularly spaced selections can interact with patterns in the order; this is a systematic risk."
  },
  {
    "id": "st-05",
    "correctMethod": "stratified",
    "prompt": "A college has 160 Year 12 pupils and 240 Year 13 pupils. For 40 survey places, it draws 16 pupils at random from the Year 12 register and 24 at random from Year 13.",
    "reason": "The 40:60 population split is preserved by separate random selections within the two year-group strata.",
    "contrast": "It is not quota sampling because members of each year group are drawn randomly."
  },
  {
    "id": "st-06",
    "correctMethod": "stratified",
    "prompt": "A hospital has lists of 80 day-shift and 120 night-shift nurses. It randomly chooses eight from the first list and twelve from the second for a 20-person survey.",
    "reason": "The 2:3 shift proportions and within-shift random selection establish proportional stratified sampling.",
    "contrast": "Two shift lists do not make this quota: the selection within each is random."
  },
  {
    "id": "st-07",
    "correctMethod": "stratified",
    "prompt": "An ecological study groups 500 recorded trees into 300 native and 200 introduced trees. It selects 30 native and 20 introduced trees using separate random-number draws.",
    "reason": "The 60:40 allocation matches the population groups, and selection is random within each stratum.",
    "contrast": "This is not a single simple random sample across one undivided frame."
  },
  {
    "id": "st-08",
    "correctMethod": "stratified",
    "prompt": "An organisation records 100 staff in Operations, 150 in Sales and 250 in Support. For a sample of 50, it randomly selects 10, 15 and 25 staff from the respective departmental registers.",
    "reason": "Each department receives its proportional share and names are drawn randomly inside each department.",
    "contrast": "Specifying departmental shares alone would not suffice without the within-group draws."
  },
  {
    "id": "st-09",
    "correctMethod": "stratified",
    "prompt": "A community project needs 30 respondents from an electoral roll containing 600 urban and 400 rural residents. It randomly draws 18 urban and 12 rural names from separate verified lists.",
    "reason": "The 60:40 population share is preserved by random selections within the urban and rural strata.",
    "contrast": "The verified lists allow probability selection rather than interviewer convenience."
  },
  {
    "id": "st-10",
    "correctMethod": "stratified",
    "prompt": "A museum records 200 adult visitors and 100 child visitors on complete ticket lists. Researchers separately and randomly select 20 adults and 10 children for a 30-person interview.",
    "reason": "The prescribed 2:1 proportional allocation and independent within-stratum randomness define stratified sampling.",
    "contrast": "Matching proportions does not make a design quota sampling when selection is random."
  },
  {
    "id": "qu-05",
    "correctMethod": "quota",
    "prompt": "A festival survey needs 30 adult and 20 teenage responses. Interviewers approach any willing visitors and stop asking each age group once its target is filled.",
    "reason": "Age-group targets, rather than random draws, control which available respondents are recruited.",
    "contrast": "This is not mere opportunity sampling because the number from each group is fixed in advance."
  },
  {
    "id": "qu-06",
    "correctMethod": "quota",
    "prompt": "A gym wants 15 responses from morning members and 15 from evening members. Staff invite convenient customers during both shifts until they have 15 in each category.",
    "reason": "The two fixed targets are filled by non-random recruitment of available customers.",
    "contrast": "Equivalent group totals do not imply stratified sampling without random draws inside each shift."
  },
  {
    "id": "qu-07",
    "correctMethod": "quota",
    "prompt": "An arts centre sets targets of 20 local residents and 10 visitors. Volunteers interview approachable people at the entrance, stopping each category when its quota is full.",
    "reason": "Non-random interviews continue until pre-specified resident and visitor quotas are reached.",
    "contrast": "This is not a census of either group and the targets do not guarantee representativeness."
  },
  {
    "id": "qu-08",
    "correctMethod": "quota",
    "prompt": "Market researchers require 40 weekday shoppers and 60 weekend shoppers. They ask willing shoppers at the shop until each preset category total is met.",
    "reason": "The fixed group totals govern convenience-based recruitment; this is quota sampling.",
    "contrast": "Unlike stratified sampling, there is no random-number draw from weekday and weekend lists."
  },
  {
    "id": "qu-09",
    "correctMethod": "quota",
    "prompt": "A student survey specifies 12 boarders and 18 day pupils. Surveyors approach pupils near the canteen and turn away later volunteers from groups whose targets are complete.",
    "reason": "Explicit targets and non-random recruitment give a quota sample.",
    "contrast": "A convenient location does not make the method purely opportunity-based when group quotas must be met."
  },
  {
    "id": "qu-10",
    "correctMethod": "quota",
    "prompt": "Researchers are told to obtain ten responses from each of three age brackets. They recruit willing people outside a cinema until all three bracket totals have been reached.",
    "reason": "The study fills pre-set age-bracket quotas using volunteers rather than random draws.",
    "contrast": "Random allocation within strata is missing, so equal group totals do not create stratified sampling."
  },
  {
    "id": "op-05",
    "correctMethod": "opportunity",
    "prompt": "To explore study habits, a pupil questions the first 25 classmates who are available in the common room after lunch, without setting any group totals.",
    "reason": "The respondents are chosen because they happen to be easily accessible at that time.",
    "contrast": "No group targets are imposed, so the design is not quota sampling."
  },
  {
    "id": "op-06",
    "correctMethod": "opportunity",
    "prompt": "A volunteer interviews 18 people willing to stop at the entrance of a sports centre on Saturday morning. There is no membership list or recruitment rule beyond availability.",
    "reason": "The interviewees are convenient volunteers at a particular place and time.",
    "contrast": "Without random numbers or preset quotas, the approach is opportunity sampling."
  },
  {
    "id": "op-07",
    "correctMethod": "opportunity",
    "prompt": "To estimate travel times, a researcher asks the next 20 passengers waiting at one ferry terminal to share their journey details.",
    "reason": "The researcher recruits whoever is present at the terminal rather than drawing from a population frame.",
    "contrast": "Interviewing the next people in a queue is not systematic random sampling without a random start and interval."
  },
  {
    "id": "op-08",
    "correctMethod": "opportunity",
    "prompt": "A shop assistant surveys everyone who will answer during a short break, stopping after 12 replies; no age or product-category targets have been set.",
    "reason": "People present and willing during the break form the convenient sample.",
    "contrast": "Stopping after 12 total replies is a sample-size target, not a set of subgroup quotas."
  },
  {
    "id": "op-09",
    "correctMethod": "opportunity",
    "prompt": "A team collecting opinions on park lighting asks 35 people they encounter at the main gate at 6 p.m., with no randomisation or subgroup targets.",
    "reason": "The selection depends on who is available at one location and time.",
    "contrast": "The time of day may exclude residents who never use the park in the evening."
  },
  {
    "id": "op-10",
    "correctMethod": "opportunity",
    "prompt": "A researcher seeks quick feedback on a college event and interviews 20 volunteers who approach an information desk on the day, without choosing names from a register.",
    "reason": "The sample consists of self-selected available volunteers, not a chance-based draw.",
    "contrast": "There are no separate group quotas to distinguish this from ordinary opportunity sampling."
  }
];
