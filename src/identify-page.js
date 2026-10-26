// Mark the existing Which Method? page without changing core grading or routes.
// Observes only replacement of the page itself; never modifies question state.
const mount=document.getElementById('app');
const apply=()=>{
 const page=mount.querySelector('.activity-page');
 if(page?.querySelector('.classification-panel')||page?.querySelector('#scenario-length')){
   page.classList.add('identify-page');
 }
};
new MutationObserver(apply).observe(mount,{childList:true,subtree:true});
apply();
