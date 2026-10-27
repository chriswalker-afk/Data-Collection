/**
 * Sampling Arcade Pass 5 — Puzzle Relay question bank.
 * IMPORTANT: this module belongs in Cloudflare Worker ONLY. Never publish in Pages.
 * Three complementary tasks per puzzle: identify, evaluate, and improve/apply.
 * The Worker makes a safe projection which removes correct answer IDs.
 */
const part=(prompt,correct,alternatives,explanation)=>({
  prompt,correct,choices:[correct,...alternatives],explanation
});
const puzzle=(id,title,context,parts)=>({id,title,context,parts});
export const RELAY_PUZZLES=Object.freeze([
  puzzle('library-register','The library survey',
    'A school has a complete numbered list of its 1,250 students. Twenty-five distinct random numbers are generated to select students.',[
    part('Which sampling method is used to choose library pupils?','Simple random sampling',['Systematic sampling','Quota sampling','Opportunity sampling'],'Random selection gives each possible group of 25 an equal probability when the number generator selects distinct subsets uniformly.'),
    part('Which limitation remains?','A small year group could be underrepresented by chance.',['Everyone has been surveyed.','The sample is automatically biased.','All year groups are guaranteed proportional representation.'],'A simple random sample need not preserve proportions of small subgroups.'),
    part('How could coverage of each year group be guaranteed?','Divide by year group and randomly sample within each group.',['Ask the first pupils entering the library.','Let interviewers fill year-group quotas by convenience.','Choose every fifth pupil without a random start.'],'Stratification can guarantee specified subgroup representation while retaining random selection.')
  ]),
  puzzle('bus-register','Bus passenger patterns',
    'A bus company sorts 480 registered passengers alphabetically, picks a random starting position from 1 to 8, then selects every eighth name.',[
    part('Which method is being used?','Systematic sampling',['Simple random sampling','Quota sampling','Census'],'A random start followed by a fixed sampling interval defines systematic sampling.'),
    part('What risk should be checked in the ordered list?','A repeating pattern may align with the sampling interval.',['Every individual has refused to respond.','The method requires taking every person.','The sampling interval is always irrational.'],'Periodic ordering can introduce systematic distortion.'),
    part('Which practical improvement addresses the ordering risk?','Randomise the list before applying the interval.',['Remove the random start.','Ask volunteers at one bus stop.','Change every selected response to the mean.'],'Randomising order breaks a potential periodic connection between list order and the interval.')
  ]),
  puzzle('clubs-year-groups','After-school clubs',
    'A researcher separates school pupils into year groups and draws a random sample within each, using sample sizes proportional to the groups.',[
    part('What sampling method is used for the school clubs?','Stratified random sampling',['Quota sampling','Opportunity sampling','Systematic sampling'],'The population is partitioned into strata and students are selected at random within each.'),
    part('What extra information is essential for proportional allocation?','The number of students in each year group.',['The average height of all teachers.','Only the first name in each class.','The seating order in the school hall.'],'The allocation n_h = n N_h / N needs the stratum sizes.'),
    part('Which step preserves randomness?','Select the required names randomly within every stratum.',['Let a teacher choose friendly students in each stratum.','Interview the nearest students until each quota is full.','Pick the first students alphabetically.'],'Random choice within every stratum distinguishes stratified sampling from quota sampling.')
  ]),
  puzzle('lunch-queue','The lunchtime queue',
    'A student asks the first 40 pupils at the canteen to rate school lunches.',[
    part('What sampling method is actually used?','Opportunity sampling',['Simple random sampling','Stratified random sampling','Systematic sampling with a random start'],'The available pupils are selected for convenience.'),
    part('Why might the result be unrepresentative?','The lunchtime queue may exclude pupils with different lunch habits.',['Forty is not an integer.','All sampling frames are automatically complete.','The method is a census.'],'Convenience samples may systematically omit people who do not visit at that time.'),
    part('What is a more defensible selection procedure?','Randomly choose pupils from a school-wide sampling frame.',['Ask only pupils who buy lunch every day.','Use the same queue at the same time.','Ask teachers to pick keen volunteers.'],'A school-wide frame and random selection improve the selection procedure.')
  ]),
  puzzle('town-survey','The town survey',
    'An interviewer is told to ask 30 adults under 30 and 30 adults aged 30 or over, choosing anyone available to fill each target.',[
    part('Which method fits the selection?','Quota sampling',['Stratified random sampling','Simple random sampling','Census'],'Specified group counts combined with nonrandom selection within groups is quota sampling.'),
    part('What is the main methodological concern?','Choice within the quotas is still nonrandom.',['Group quotas always force every possible sample to be equally likely.','The interviewer must first measure every adult.','Proportions can never be specified.'],'Filling quotas can preserve selected group proportions but cannot remove interviewer selection bias.'),
    part('How could this become stratified random sampling?','Use a frame for each age stratum and choose members randomly.',['Keep asking convenient people until quotas are full.','Choose only volunteers within each quota.','Discard the age group information.'],'The defining change is random selection within each stratum.')
  ]),
  puzzle('sports-register','School sports day',
    'A teacher uses a random number generator to choose 20 students from a complete numbered list, ignoring repeats.',[
    part('Which method is intended?','Simple random sampling',['Quota sampling','Opportunity sampling','Census'],'Each sample of 20 different pupils can be selected with the same probability when the random procedure is uniform.'),
    part('Why must repeated numbers be ignored?','The sample must contain 20 distinct students.',['Repeated numbers are always the least random.','Random numbers cannot be repeated.','A repeat proves systematic bias.'],'Ignoring repeats is one way to draw 20 distinct units without replacement.'),
    part('What should be checked before drawing numbers?','The numbered list includes all eligible pupils.',['Every pupil is at the sports field already.','The interviewer knows each pupil personally.','The data are all qualitative.'],'An incomplete sampling frame can omit eligible pupils even when selection is random.')
  ]),
  puzzle('clinic-appointments','Clinic appointments',
    'A clinic examines every tenth appointment on a date-ordered list, starting from an appointment selected at random among the first ten.',[
    part('Identify the sampling method.','Systematic sampling',['Quota sampling','Opportunity sampling','Simple random sampling'],'A random starting position and a fixed interval constitute systematic sampling.'),
    part('What specific risk may arise?','Appointment types may repeat in a pattern aligned with every tenth slot.',['A list cannot be ordered by time.','Every patient has identical needs.','Random starts always eliminate periodicity.'],'Periodic patterns can distort the selected appointments.'),
    part('How should the sampling design be improved?','Check the list for periodicity and consider randomising order.',['Always use the first ten patients.','Remove patients from busy mornings.','Replace the random start with the interviewer’s preference.'],'Recognising and breaking periodic ordering is a defensible improvement.')
  ]),
  puzzle('music-auditions','Music department auditions',
    'There are 300 students, including 90 in the orchestra. A proportional stratified sample of 60 is required.',[
    part('Which sampling method is specified?','Stratified random sampling',['Opportunity sampling','Quota sampling with volunteer selection','Census'],'The requested design selects random units within strata in proportion to the population.'),
    part('How many orchestra students should be selected?','18',['9','30','90'],'The allocation is (90/300) × 60 = 18.'),
    part('How should the 18 orchestra students be chosen?','Randomly from the orchestra sampling frame.',['Ask the first 18 attending practice.','Take the 18 students with highest marks.','Allow the conductor to pick favourites.'],'Random selection inside the stratum prevents interviewer selection bias.')
  ]),
  puzzle('shopping-centre','Shopping centre opinions',
    'A survey takes responses from whoever walks past a booth between 12:00 and 12:30.',[
    part('What method is actually being used?','Opportunity sampling',['Stratified random sampling','Simple random sampling','Census'],'People are selected because they are conveniently available.'),
    part('What is a plausible source of bias?','People who visit outside lunchtime are not represented.',['Twenty minutes must be a census.','All visitors have equal selection probability.','A random start removes the time restriction.'],'Time-limited convenience sampling can systematically underrepresent some groups.'),
    part('Which redesign best helps address this?','Sample from a comprehensive customer list using a random mechanism.',['Survey the same queue tomorrow.','Invite only friends of the researcher.','Discard all responses from older visitors.'],'Use a frame and a chance-based procedure matched to the target population.')
  ]),
  puzzle('online-response','Online questionnaire',
    'A random group of pupils is emailed a survey, but only a small fraction reply.',[
    part('What was the original selection method?','Simple random sampling',['Quota sampling','Opportunity sampling','Census'],'The invitation sample was selected by random draw.'),
    part('What major concern remains despite random invitations?','Non-response bias if responders differ systematically from non-responders.',['Sampling variation is impossible.','The original frame becomes a census.','Random invitations guarantee an unbiased response set.'],'Non-response can undermine the representativeness of the final observed responses.'),
    part('What is an appropriate response?','Follow up sampled non-responders and report the response rate.',['Replace all non-responders with volunteers.','Increase the sample to infinity without follow-up.','Ignore the missing responses.'],'Follow-up and transparent reporting address the actual response mechanism.')
  ]),
  puzzle('whole-school-count','A full school census',
    'A school records the year group of every enrolled student on one specified date.',[
    part('Which study design is described?','Census',['Simple random sample','Quota sample','Opportunity sample'],'The entire defined school population is observed.'),
    part('Which statement about the results is correct?','There is no sampling variation from selecting only a subset.',['All recording errors become impossible.','All missing values must be correct.','Every numerical summary is biased.'],'A census removes sampling variation, but data collection errors may remain.'),
    part('What practical limitation is most relevant for large populations?','Time and cost of collecting measurements from every unit.',['A census must select every tenth student.','A census cannot collect qualitative data.','A census is always based on only five observations.'],'A census can be expensive and burdensome for a large population.')
  ]),
  puzzle('housing-directory','An incomplete address list',
    'A researcher randomly chooses households from a directory that excludes newly built homes.',[
    part('What method is used on the supplied list?','Simple random sampling',['Quota sampling','Opportunity sampling','A census of all households'],'Households on the list are selected randomly, but the list may not cover the population.'),
    part('What is the central problem?','Undercoverage: new homes have zero chance of selection.',['Random numbers stop being random.','The sample is necessarily continuous data.','The sampling interval is too small.'],'A random procedure cannot select people missing from its frame.'),
    part('Which action most directly improves the design?','Update the sampling frame to cover newly built homes.',['Increase only the number drawn from the old directory.','Interview neighbours as substitutes.','Stop using any random procedure.'],'Repair frame coverage before applying random selection.')
  ]),
  puzzle('market-research','Age-group quotas',
    'A company sets age-group targets and allows interviewers to approach anyone convenient within those groups.',[
    part('Which selection strategy is employed?','Quota sampling',['Stratified random sampling','Simple random sampling','Systematic sampling'],'The group targets are filled without random selection.'),
    part('Which limitation cannot be dismissed?','Interviewers can introduce selection bias within groups.',['Quota sampling cannot record age.','All interviewers use a complete population frame.','Every possible sample has the same probability.'],'Matching proportions alone cannot guarantee representativeness.')
    ,part('Which claim is most accurate?','Quota and stratified sampling both use groups, but only stratified requires random selection within each.',['Both methods always use the same selection probabilities.','Quota sampling is necessarily a census.','Stratified sampling always asks volunteers.'],'The key distinction is within-group selection, not merely whether proportions are set.')
  ]),
  puzzle('field-transect','Environmental sampling',
    'A scientist chooses a random start and measures soil depth at regular 5-metre intervals along a transect.',[
    part('Which sampling method is described?','Systematic sampling',['Quota sampling','Opportunity sampling','Census'],'Regular intervals after a chance-based start define systematic sampling.'),
    part('Why might the measurements be systematically distorted?','Vegetation may repeat in a spatial pattern linked to the interval.',['Soil depth must be discrete.','Using a transect makes the population a census.','All patterns are removed by using a random start.'],'Periodic spatial patterns can line up with the interval.'),
    part('What is an appropriate analysis or design change?','Check spatial patterns and consider random locations or a different interval.',['Move the random start to zero every time.','Only measure the wettest soil.','Exclude all unexpected readings without explanation.'],'A revised interval or chance-based locations can reduce periodicity risks.')
  ]),
  puzzle('school-council','Student council preferences',
    'The school has 800 pupils. A simple random sample of 80 is taken from its full register.',[
    part('What fraction of the school is sampled?','10%',['1%','20%','80%'],'The sampling fraction is 80/800 = 0.1 = 10%.'),
    part('What does this design guarantee?','Every possible 80-pupil group has the same selection probability.',['The sample is guaranteed to match each year group.','No chosen pupil can give an incorrect answer.','Every population member must reply.'],'Equal group selection probability is the defining property of a simple random sample.'),
    part('Which limitation may still occur?','Chance variation may make small groups underrepresented.',['Simple random selection makes variation impossible.','The sample contains the entire population.','Random samples always repeat names.'],'Even a legitimate simple random sample may be unrepresentative in some characteristics by chance.')
  ]),
  puzzle('school-sports-clubs','Fair club representation',
    'A school wishes to compare satisfaction between four sports clubs of different sizes, and wants each club represented.',[
    part('Which design deliberately includes all four clubs?','Stratified random sampling',['Opportunity sampling','A single lunchtime convenience sample','Quota sampling with interviewers choosing friends'],'Stratify by club and draw randomly within each to guarantee selected group representation.'),
    part('How might the sample allocations be determined?','Assign numbers proportional to each club’s share of the population.',['Always take exactly one student without checking sizes.','Select only club captains.','Choose all pupils attending on one day.'],'Proportional allocation reflects the sizes of the strata.'),
    part('What must happen inside each chosen club?','Members are selected by a random process.',['Captains hand-pick the most keen members.','Convenient people are recruited until a quota is full.','The investigator surveys only close friends.'],'Random selection within clubs makes this stratified random sampling.')
  ])
]);
// Static bank integrity: three tasks per scenario, 4 distinct responses per task,
// and IDs that never collide (used for replay and reconnect protection).
if(new Set(RELAY_PUZZLES.map(p=>p.id)).size!==RELAY_PUZZLES.length ||
  RELAY_PUZZLES.some(p=>p.parts.length!==3 || p.parts.some(x=>
    x.choices.length!==4 || new Set(x.choices).size!==4 || !x.explanation)))
  throw new Error('Invalid Puzzle Relay audited bank');