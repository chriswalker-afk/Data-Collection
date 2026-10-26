// Pass 5: entirely server-derived classroom achievements and a deterministic ceremony.
// No individual achievement or point total is accepted from a browser request.
export const ARENA_AWARDS=Object.freeze([
  {id:'sampling-fox',emoji:'🦊',name:'Sampling Fox',detail:'Recognised three different sampling methods correctly.'},
  {id:'bias-buster',emoji:'🦸',name:'Bias Buster',detail:'Identified both quota and opportunity sampling accurately.'},
  {id:'method-maestro',emoji:'🦉',name:'Method Maestro',detail:'Recognised all five sampling methods correctly.'},
  {id:'recall-raven',emoji:'🐦',name:'Recall Raven',detail:'Retrieved five distinct mathematical terms from memory.'},
  {id:'match-mongoose',emoji:'🦦',name:'Match-Up Mongoose',detail:'Connected all six terms to their definitions correctly.'},
  {id:'sorting-salamander',emoji:'🦎',name:'Sorting Salamander',detail:'Classified every statement in a Sort It! board correctly.'},
  {id:'precision-penguin',emoji:'🐧',name:'Precision Penguin',detail:'Made at least five checked decisions without a single error.'},
  {id:'steady-stoat',emoji:'🐾',name:'Steady Stoat',detail:'Completed three consecutive questions with full marks.'},
  {id:'comeback-koala',emoji:'🐨',name:'Comeback Koala',detail:'Recovered from an error with two later fully correct questions.'},
  {id:'calm-capybara',emoji:'🦫',name:'Calm Capybara',detail:'Made at least ten correct decisions across multiple boards with 80% accuracy.'},
  {id:'quota-quokka',emoji:'🐨',name:'Quota Quokka',detail:'Recognised quota sampling correctly in two different scenarios.'}
].map(x=>Object.freeze(x)));
const validScore=n=>Number.isSafeInteger(n)&&n>=0;
function normalizedResults(room,id){
  // These entries are written only after successful, one-use server grading.
  return (Array.isArray(room.results)?room.results:[])
    .filter(r=>r&&r.playerId===id&&Number.isInteger(r.index)&&r.index>=0&&
      typeof r.questionId==='string'&&Number.isInteger(r.correctCount)&&
      Number.isInteger(r.total)&&r.total>=1&&
      r.correctCount>=0&&r.correctCount<=r.total&&validScore(r.points))
    .sort((a,b)=>a.index-b.index);
}
function longestFullStreak(rows){
  let current=0,best=0,previous=-2;
  for(const r of rows){
    current=r.correctCount===r.total?(r.index===previous+1?current+1:1):0;
    best=Math.max(best,current);
    previous=r.index;
  }
  return best;
}
export function roomAwards(room){
  const game=room.game||'which';
  const podium=[...(room.players||[])].filter(p=>validScore(p.score)&&p.score>0)
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'en-GB'))
    .map((p,index,arr)=>({
      id:p.id,name:p.name,score:p.score,
      rank:index>0&&arr[index-1].score===p.score?null:index+1
    }));
  let lastRank=0;
  for(const row of podium){
    if(row.rank===null)row.rank=lastRank;
    else lastRank=row.rank;
  }
  const standings=podium.filter(p=>p.rank<=3);
  const earned={};
  for(const p of room.players||[]){
    const rows=normalizedResults(room,p.id);
    const evaluated=rows.reduce((n,r)=>n+r.total,0);
    const correct=rows.reduce((n,r)=>n+r.correctCount,0);
    const methods=new Set(rows.filter(r=>r.correctCount===r.total&&r.method)
      .map(r=>r.method));
    const terms=new Set(rows.filter(r=>r.correctCount===r.total&&r.termId)
      .map(r=>r.termId));
    const full=r=>r.correctCount===r.total;
    const wrong=rows.findIndex(r=>!full(r));
    const recovered=wrong>=0&&rows.slice(wrong+1).filter(full).length>=2;
    const won=[];
    for(const award of ARENA_AWARDS){
      const qualifies={
        'sampling-fox':game==='which'&&methods.size>=3,
        'bias-buster':game==='which'&&methods.has('quota')&&methods.has('opportunity'),
        'method-maestro':game==='which'&&methods.size===5,
        'recall-raven':game==='speed'&&terms.size>=5,
        'match-mongoose':game==='match'&&rows.some(r=>r.total===6&&full(r)),
        'sorting-salamander':game==='sort'&&rows.some(r=>r.total>=8&&full(r)),
        'precision-penguin':evaluated>=5&&correct===evaluated,
        'steady-stoat':longestFullStreak(rows)>=3,
        'comeback-koala':rows.length>=3&&recovered,
        'calm-capybara':rows.length>=2&&evaluated>=12&&correct>=10&&correct/evaluated>=.8,
        'quota-quokka':game==='which'&&rows.filter(r=>r.method==='quota'&&full(r)).length>=2
      }[award.id];
      if(qualifies)won.push(award.id);
    }
    earned[p.id]=won;
  }
  return {standings,earned};
}
export function makeCeremony(room){
  const {standings,earned}=roomAwards(room);
  const players=room.players||[];
  const slides=[
    {kind:'welcome',title:'The Grand Sampling Arcade Awards',
      subtitle:'A celebration of mathematical thinking, accuracy and persistence.'},
    {kind:'podium',title:'Our classroom podium',standings,
      subtitle:standings.length?'Scores reflect checked mathematics, not participation clicks.':
        'No positive scores this round. Celebrate the learning, not an invented winner.'}
  ];
  for(const award of ARENA_AWARDS){
    const recipients=players.filter(p=>earned[p.id]?.includes(award.id))
      .map(p=>({id:p.id,name:p.name}));
    if(recipients.length)slides.push({
      kind:'award',award,title:award.name,recipients
    });
  }
  slides.push({kind:'finale',title:'Brilliant thinking, everyone!',
    subtitle:'Every answer is a chance to learn. Keep collecting thoughtful mathematical victories.',
    awardedCount:slides.filter(s=>s.kind==='award').length,
    recipientsCount:players.filter(p=>earned[p.id]?.length).length});
  return {slides,earned};
}
export function ceremonySnapshot(room,person){
  const c=room.ceremony;
  if(!c||!Array.isArray(c.slides))return null;
  const active=room.status==='ceremony';
  if(!active&&!c.completed)return null;
  const last=c.slides.length-1,step=Math.max(0,Math.min(last,c.step||0));
  return {step,total:c.slides.length,run:c.run||1,
    slide:active?c.slides[step]:null,completed:Boolean(c.completed)};
}
export function collectableReceipt(room,person){
  if(person.host||!room.ceremony?.completed)return null;
  return {
    // ID is created by the Worker, not supplied by an HTTP request.
    roomId:room.ceremonyId,
    game:room.game||'which',
    awarded:room.ceremony.earned?.[person.id]||[],
    completed:true
  };
}
