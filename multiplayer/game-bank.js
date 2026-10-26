// Curated Solo content projected into the Cloudflare Worker at build time.
// See multiplayer/modes.test.mjs for exact drift checks against content/*.json.
// No answers or aliases from this file are ever served before the teacher reveal.
export const GAME_CONCEPTS=[
  {
    "id": "population",
    "label": "Population",
    "definition": "The entire set of people or items that the investigation is concerned with.",
    "misconception": "A population does not have to mean everyone in a country.",
    "module": "sampling"
  },
  {
    "id": "census",
    "label": "Census",
    "definition": "An investigation in which every member of the defined population is observed or measured.",
    "misconception": "A census is not guaranteed error-free: measurements and responses can still be inaccurate.",
    "module": "sampling"
  },
  {
    "id": "sample",
    "label": "Sample",
    "definition": "Observations taken from part of a population to learn about the population as a whole.",
    "misconception": "A sample is not the same as the whole population.",
    "module": "sampling"
  },
  {
    "id": "raw-data",
    "label": "Raw data",
    "definition": "Original observations or measurements before they have been processed or summarised.",
    "misconception": "A calculated mean is a summary, not raw data.",
    "module": "sampling"
  },
  {
    "id": "sampling-unit",
    "label": "Sampling unit",
    "definition": "One individual member or item of a population that could be selected for a sample.",
    "misconception": "A sampling unit is an item or person, not the list containing them.",
    "module": "sampling"
  },
  {
    "id": "sampling-frame",
    "label": "Sampling frame",
    "definition": "A list or other identification system of the population's sampling units from which a sample can be selected.",
    "misconception": "A frame may be incomplete or out of date; it is not the sample itself.",
    "module": "sampling"
  },
  {
    "id": "random-sampling",
    "label": "Random sampling",
    "definition": "Choosing sampling units by a chance-based procedure rather than the researcher's personal judgement.",
    "misconception": "Chance-based selection does not guarantee the result represents the population; equal chances of all units also depend on the design.",
    "module": "sampling"
  },
  {
    "id": "simple-random-sampling",
    "label": "Simple random sampling",
    "definition": "Selecting a sample so that every possible group of the required size has the same probability of selection.",
    "misconception": "Equal chances for individuals alone do not fully define a simple random sample.",
    "module": "sampling"
  },
  {
    "id": "systematic-sampling",
    "label": "Systematic sampling",
    "definition": "Selecting units at regular intervals from an ordered list, using a random starting position.",
    "misconception": "Selecting every fifth pupil without randomising the starting position is an incomplete procedure.",
    "module": "sampling"
  },
  {
    "id": "stratified-sampling",
    "label": "Stratified sampling",
    "definition": "Dividing the population into non-overlapping groups (strata) and choosing a random sample within each group.",
    "misconception": "Dividing into groups does not make sampling stratified if people within them are not selected randomly.",
    "module": "sampling"
  },
  {
    "id": "stratum",
    "label": "Stratum",
    "definition": "One of the mutually exclusive groups into which a population is divided for stratified sampling.",
    "misconception": "A stratum is a group in the population, not a single sampling unit.",
    "module": "sampling"
  },
  {
    "id": "quota-sampling",
    "label": "Quota sampling",
    "definition": "Choosing people non-randomly to fill set numbers for particular population groups.",
    "misconception": "Matching group proportions does not make this stratified random sampling.",
    "module": "sampling"
  },
  {
    "id": "opportunity-sampling",
    "label": "Opportunity sampling",
    "definition": "Choosing eligible people or items that are readily available when the investigation takes place.",
    "misconception": "Opportunity sampling is non-random, and its convenient group may not reflect the population.",
    "module": "sampling"
  },
  {
    "id": "selection-bias",
    "label": "Selection bias",
    "definition": "A systematic distortion caused when some members of the target population are more likely to be selected than others.",
    "misconception": "Random sampling reduces some selection bias but cannot correct an incomplete sampling frame.",
    "module": "sampling"
  },
  {
    "id": "representativeness",
    "label": "Representative sample",
    "definition": "A sample whose relevant characteristics resemble those of the population being studied.",
    "misconception": "Matching one characteristic does not guarantee representativeness for every other characteristic.",
    "module": "sampling"
  },
  {
    "id": "sampling-variation",
    "label": "Sampling variation",
    "definition": "Differences in sample results that occur because different subsets of the same population are selected.",
    "misconception": "A different sample mean does not automatically imply a mistake or bias.",
    "module": "sampling"
  },
  {
    "id": "sampling-interval",
    "label": "Sampling interval",
    "definition": "The regular gap between successive selections in a systematic sample.",
    "misconception": "When N divided by n is not an integer, do not invent a universal rounding rule.",
    "module": "sampling"
  },
  {
    "id": "proportional-allocation",
    "label": "Proportional allocation",
    "definition": "Assigning each stratum a share of the sample proportional to its share of the population.",
    "misconception": "Proportions determine how many to sample, not who is selected inside each stratum.",
    "module": "sampling"
  },
  {
    "id": "qualitative-data",
    "label": "Qualitative data",
    "definition": "Data describing categories or qualities rather than numerical amounts.",
    "misconception": "A category may be stored as a numerical code without becoming quantitative data.",
    "module": "data"
  },
  {
    "id": "quantitative-data",
    "label": "Quantitative data",
    "definition": "Data representing numerical amounts obtained by counting or measuring.",
    "misconception": "A numeric label such as a bus route number is not necessarily quantitative.",
    "module": "data"
  },
  {
    "id": "discrete-variable",
    "label": "Discrete variable",
    "definition": "A variable that can take only separate, distinct values within its possible range.",
    "misconception": "Discrete does not necessarily mean 'whole numbers' in every context.",
    "module": "data"
  },
  {
    "id": "continuous-variable",
    "label": "Continuous variable",
    "definition": "A variable that can take any value in a continuous interval (in the mathematical model).",
    "misconception": "Rounded measurements do not turn an inherently continuous variable into a discrete one.",
    "module": "data"
  },
  {
    "id": "grouped-frequency-table",
    "label": "Grouped frequency table",
    "definition": "A frequency table in which values are collected into intervals or classes rather than listed individually.",
    "misconception": "The individual observations cannot normally be recovered exactly from grouped data.",
    "module": "data"
  },
  {
    "id": "class-boundaries",
    "label": "Class boundaries",
    "definition": "The lower and upper values that define a class interval.",
    "misconception": "Class boundaries are not always the same as printed class limits for rounded measurements.",
    "module": "data"
  },
  {
    "id": "class-width",
    "label": "Class width",
    "definition": "The difference between the upper and lower class boundaries.",
    "misconception": "Do not count the number of integers in an interval when calculating its width.",
    "module": "data"
  },
  {
    "id": "class-midpoint",
    "label": "Class midpoint",
    "definition": "The mean of the lower and upper class boundaries.",
    "misconception": "The class midpoint estimates values in the class; it need not be an actual observed value.",
    "module": "data"
  }
];
export const GAME_ALIASES={
  "simple-random-sampling": [
    "simple random sample",
    "simple random"
  ],
  "systematic-sampling": [
    "systematic sample",
    "systematic"
  ],
  "stratified-sampling": [
    "stratified sample",
    "stratified"
  ],
  "quota-sampling": [
    "quota sample",
    "quota"
  ],
  "opportunity-sampling": [
    "convenience sampling",
    "opportunity",
    "convenience sample"
  ],
  "representativeness": [
    "representative"
  ],
  "sampling-variation": [
    "sampling variability"
  ],
  "qualitative-data": [
    "categorical data",
    "qualitative",
    "categorical"
  ],
  "quantitative-data": [
    "quantitative"
  ],
  "discrete-variable": [
    "discrete"
  ],
  "continuous-variable": [
    "continuous"
  ],
  "grouped-frequency-table": [
    "grouped frequency distribution"
  ],
  "class-midpoint": [
    "midpoint",
    "class mark"
  ],
  "class-width": [
    "width of a class"
  ]
};
export const GAME_SORT_BOARDS=[
  {
    "id": "pair-srs-stratified",
    "label": "Simple random vs stratified",
    "methods": [
      "simple-random",
      "stratified"
    ],
    "statements": [
      {
        "id": "srs-objective",
        "statement": "Choosing individuals from one numbered population list using random numbers avoids deliberate interviewer preference.",
        "correctDestination": "simple-random:advantage",
        "explanation": "This reduces selection bias from personal preference but does not ensure perfect representativeness."
      },
      {
        "id": "srs-equal",
        "statement": "Every possible sample of the chosen size has the same probability.",
        "correctDestination": "simple-random:advantage",
        "explanation": "The defining property of a simple random sample."
      },
      {
        "id": "srs-small",
        "statement": "Straightforward to carry out for a small, numbered population.",
        "correctDestination": "simple-random:advantage",
        "explanation": "A complete frame and random-number generator make implementation practical."
      },
      {
        "id": "srs-frame",
        "statement": "Drawing individuals randomly from the full population requires a complete numbered list.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "An incomplete or outdated list can exclude eligible units."
      },
      {
        "id": "srs-large",
        "statement": "Can be cumbersome for a large, widely spread population.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "Obtaining the frame and contacting randomly selected units may be costly."
      },
      {
        "id": "srs-subgroups",
        "statement": "Small subgroups may be underrepresented by chance.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "No fixed subgroup proportions are guaranteed in an ordinary simple random sample."
      },
      {
        "id": "strata-proportions",
        "statement": "Ensures each specified stratum has the intended proportional representation.",
        "correctDestination": "stratified:advantage",
        "explanation": "Helpful when group proportions matter to the investigation."
      },
      {
        "id": "strata-comparison",
        "statement": "Allows planned coverage of important population groups.",
        "correctDestination": "stratified:advantage",
        "explanation": "Makes it less likely that an important group is missed by chance."
      },
      {
        "id": "strata-classify",
        "statement": "Population members must be classified into distinct strata.",
        "correctDestination": "stratified:disadvantage",
        "explanation": "Classification can be difficult or costly if group information is incomplete."
      },
      {
        "id": "strata-random",
        "statement": "Random selection is still needed within each stratum.",
        "correctDestination": "stratified:disadvantage",
        "explanation": "The method inherits framing and practical difficulties of simple random selection."
      }
    ]
  },
  {
    "id": "pair-systematic-quota",
    "label": "Systematic vs quota",
    "methods": [
      "systematic",
      "quota"
    ],
    "statements": [
      {
        "id": "sys-speed",
        "statement": "Once the interval is set, selection is quick and simple.",
        "correctDestination": "systematic:advantage",
        "explanation": "Only one random starting point is needed."
      },
      {
        "id": "sys-scale",
        "statement": "Convenient for large ordered lists.",
        "correctDestination": "systematic:advantage",
        "explanation": "Regular selection can be easier to administer than choosing many separate random numbers."
      },
      {
        "id": "sys-frame",
        "statement": "An ordered sampling frame is required.",
        "correctDestination": "systematic:disadvantage",
        "explanation": "The method needs a list with defined positions."
      },
      {
        "id": "sys-periodic",
        "statement": "A periodic pattern in the list can produce a distorted sample.",
        "correctDestination": "systematic:disadvantage",
        "explanation": "For example, if every tenth entry belongs to a particular category, selecting every tenth unit can be unrepresentative."
      },
      {
        "id": "quota-proportions",
        "statement": "Chosen group proportions can be reflected in a relatively small sample.",
        "correctDestination": "quota:advantage",
        "explanation": "This only guarantees representation for the characteristics used to set quotas."
      },
      {
        "id": "quota-no-frame",
        "statement": "No complete list of the population is required.",
        "correctDestination": "quota:advantage",
        "explanation": "People can be recruited directly into target groups."
      },
      {
        "id": "quota-comparison",
        "statement": "Specified groups can be included for comparison.",
        "correctDestination": "quota:advantage",
        "explanation": "Only those grouping characteristics are controlled."
      },
      {
        "id": "quota-selection",
        "statement": "Non-random recruitment can introduce selection bias.",
        "correctDestination": "quota:disadvantage",
        "explanation": "Convenient or approachable people may be overrepresented within each quota."
      },
      {
        "id": "quota-classify",
        "statement": "Defining and checking many groups can be costly or inaccurate.",
        "correctDestination": "quota:disadvantage",
        "explanation": "More characteristics create more group combinations and administrative burden."
      },
      {
        "id": "quota-nonresponse",
        "statement": "Refusals may not be recorded as non-responses.",
        "correctDestination": "quota:disadvantage",
        "explanation": "The replacement of non-respondents can hide participation problems."
      }
    ]
  },
  {
    "id": "pair-stratified-quota",
    "label": "Stratified vs quota",
    "methods": [
      "stratified",
      "quota"
    ],
    "statements": [
      {
        "id": "strata-proportions",
        "statement": "After randomly selecting individuals within each stratum, the planned sample proportions are maintained.",
        "correctDestination": "stratified:advantage",
        "explanation": "Helpful when group proportions matter to the investigation."
      },
      {
        "id": "strata-comparison",
        "statement": "Random draws within each stratum provide planned coverage of important groups.",
        "correctDestination": "stratified:advantage",
        "explanation": "Makes it less likely that an important group is missed by chance."
      },
      {
        "id": "strata-classify",
        "statement": "Population members must be classified into distinct strata.",
        "correctDestination": "stratified:disadvantage",
        "explanation": "Classification can be difficult or costly if group information is incomplete."
      },
      {
        "id": "strata-random",
        "statement": "Random selection is still needed within each stratum.",
        "correctDestination": "stratified:disadvantage",
        "explanation": "The method inherits framing and practical difficulties of simple random selection."
      },
      {
        "id": "quota-proportions",
        "statement": "Non-random recruitment to fixed interviewer targets can reflect specified population group proportions.",
        "correctDestination": "quota:advantage",
        "explanation": "This only guarantees representation for the characteristics used to set quotas."
      },
      {
        "id": "quota-no-frame",
        "statement": "Filling predefined group targets by approaching available people does not require a complete population register.",
        "correctDestination": "quota:advantage",
        "explanation": "People can be recruited directly into target groups."
      },
      {
        "id": "quota-comparison",
        "statement": "Interviewers can recruit to stated group targets to include the chosen groups for comparison.",
        "correctDestination": "quota:advantage",
        "explanation": "Only those grouping characteristics are controlled."
      },
      {
        "id": "quota-selection",
        "statement": "Non-random recruitment can introduce selection bias.",
        "correctDestination": "quota:disadvantage",
        "explanation": "Convenient or approachable people may be overrepresented within each quota."
      },
      {
        "id": "quota-classify",
        "statement": "Defining and checking many groups can be costly or inaccurate.",
        "correctDestination": "quota:disadvantage",
        "explanation": "More characteristics create more group combinations and administrative burden."
      },
      {
        "id": "quota-nonresponse",
        "statement": "Refusals may not be recorded as non-responses.",
        "correctDestination": "quota:disadvantage",
        "explanation": "The replacement of non-respondents can hide participation problems."
      }
    ]
  },
  {
    "id": "pair-srs-opportunity",
    "label": "Simple random vs opportunity",
    "methods": [
      "simple-random",
      "opportunity"
    ],
    "statements": [
      {
        "id": "srs-objective",
        "statement": "Randomly selected numbers remove deliberate interviewer choice from the selection stage.",
        "correctDestination": "simple-random:advantage",
        "explanation": "This reduces selection bias from personal preference but does not ensure perfect representativeness."
      },
      {
        "id": "srs-equal",
        "statement": "Every possible sample of the chosen size has the same probability.",
        "correctDestination": "simple-random:advantage",
        "explanation": "The defining property of a simple random sample."
      },
      {
        "id": "srs-small",
        "statement": "Straightforward to carry out for a small, numbered population.",
        "correctDestination": "simple-random:advantage",
        "explanation": "A complete frame and random-number generator make implementation practical."
      },
      {
        "id": "srs-frame",
        "statement": "A complete sampling frame is needed.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "An incomplete or outdated list can exclude eligible units."
      },
      {
        "id": "srs-large",
        "statement": "Can be cumbersome for a large, widely spread population.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "Obtaining the frame and contacting randomly selected units may be costly."
      },
      {
        "id": "srs-subgroups",
        "statement": "Small subgroups may be underrepresented by chance.",
        "correctDestination": "simple-random:disadvantage",
        "explanation": "No fixed subgroup proportions are guaranteed in an ordinary simple random sample."
      },
      {
        "id": "opp-easy",
        "statement": "Easy to arrange with people already available.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Does not require a full sampling frame."
      },
      {
        "id": "opp-cost",
        "statement": "Usually inexpensive and fast to carry out.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Convenient location and time reduce recruitment effort."
      },
      {
        "id": "opp-unrepresentative",
        "statement": "People present in one place or time may not represent the wider population.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "E.g. morning shoppers may differ from evening shoppers."
      },
      {
        "id": "opp-researcher",
        "statement": "Who is approached may depend heavily on the researcher.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "Personal choice and willingness to respond can distort the sample."
      }
    ]
  },
  {
    "id": "pair-quota-opportunity",
    "label": "Quota vs opportunity",
    "methods": [
      "quota",
      "opportunity"
    ],
    "statements": [
      {
        "id": "quota-proportions",
        "statement": "Chosen group proportions can be reflected in a relatively small sample.",
        "correctDestination": "quota:advantage",
        "explanation": "This only guarantees representation for the characteristics used to set quotas."
      },
      {
        "id": "quota-no-frame",
        "statement": "Filling specified subgroup targets avoids needing a register of every eligible person.",
        "correctDestination": "quota:advantage",
        "explanation": "People can be recruited directly into target groups."
      },
      {
        "id": "quota-comparison",
        "statement": "Specified groups can be included for comparison.",
        "correctDestination": "quota:advantage",
        "explanation": "Only those grouping characteristics are controlled."
      },
      {
        "id": "quota-selection",
        "statement": "Non-random recruitment can introduce selection bias.",
        "correctDestination": "quota:disadvantage",
        "explanation": "Convenient or approachable people may be overrepresented within each quota."
      },
      {
        "id": "quota-classify",
        "statement": "Defining and checking many groups can be costly or inaccurate.",
        "correctDestination": "quota:disadvantage",
        "explanation": "More characteristics create more group combinations and administrative burden."
      },
      {
        "id": "quota-nonresponse",
        "statement": "Refusals may not be recorded as non-responses.",
        "correctDestination": "quota:disadvantage",
        "explanation": "The replacement of non-respondents can hide participation problems."
      },
      {
        "id": "opp-easy",
        "statement": "Easy to arrange with people already available.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Does not require a full sampling frame."
      },
      {
        "id": "opp-cost",
        "statement": "Usually inexpensive and fast to carry out.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Convenient location and time reduce recruitment effort."
      },
      {
        "id": "opp-unrepresentative",
        "statement": "People present in one place or time may not represent the wider population.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "E.g. morning shoppers may differ from evening shoppers."
      },
      {
        "id": "opp-researcher",
        "statement": "Who is approached may depend heavily on the researcher.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "Personal choice and willingness to respond can distort the sample."
      }
    ]
  },
  {
    "id": "pair-systematic-opportunity",
    "label": "Systematic vs opportunity",
    "methods": [
      "systematic",
      "opportunity"
    ],
    "statements": [
      {
        "id": "sys-speed",
        "statement": "Once the interval is set, selection is quick and simple.",
        "correctDestination": "systematic:advantage",
        "explanation": "Only one random starting point is needed."
      },
      {
        "id": "sys-scale",
        "statement": "Convenient for large ordered lists.",
        "correctDestination": "systematic:advantage",
        "explanation": "Regular selection can be easier to administer than choosing many separate random numbers."
      },
      {
        "id": "sys-frame",
        "statement": "An ordered sampling frame is required.",
        "correctDestination": "systematic:disadvantage",
        "explanation": "The method needs a list with defined positions."
      },
      {
        "id": "sys-periodic",
        "statement": "A periodic pattern in the list can produce a distorted sample.",
        "correctDestination": "systematic:disadvantage",
        "explanation": "For example, if every tenth entry belongs to a particular category, selecting every tenth unit can be unrepresentative."
      },
      {
        "id": "opp-easy",
        "statement": "Easy to arrange with people already available.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Does not require a full sampling frame."
      },
      {
        "id": "opp-cost",
        "statement": "Usually inexpensive and fast to carry out.",
        "correctDestination": "opportunity:advantage",
        "explanation": "Convenient location and time reduce recruitment effort."
      },
      {
        "id": "opp-unrepresentative",
        "statement": "People present in one place or time may not represent the wider population.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "E.g. morning shoppers may differ from evening shoppers."
      },
      {
        "id": "opp-researcher",
        "statement": "Who is approached may depend heavily on the researcher.",
        "correctDestination": "opportunity:disadvantage",
        "explanation": "Personal choice and willingness to respond can distort the sample."
      }
    ]
  }
];
