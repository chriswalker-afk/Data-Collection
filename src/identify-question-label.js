// Keep a consistent QUESTION label on the premium Which Method? case study.
const mount=document.getElementById('app');
const fix=()=>{
 const node=mount.querySelector('.identify-panel > .eyebrow');
 if(node&&node.textContent==='CASE STUDY · SELECTION METHOD'){
   node.textContent='QUESTION · CASE STUDY / SELECTION METHOD';
 }
};
new MutationObserver(fix).observe(mount,{subtree:true,childList:true});
fix();
