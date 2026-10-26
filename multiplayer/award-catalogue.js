// Safe public catalogue of multiplayer award names, emojis and descriptions.
// Mathematical conditions and scoring stay server-side in ceremony-rules.js.
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
