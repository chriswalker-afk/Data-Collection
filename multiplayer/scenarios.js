// Audited Edexcel 9MA0 scenarios, generated from content/scenarios.json.
// Keep this in sync with the main question bank; run tests/multiplayer.test.mjs.
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
  }
];
