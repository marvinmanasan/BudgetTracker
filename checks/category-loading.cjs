const assert=require('node:assert/strict');
const {createLoader}=require('./load-typescript.cjs');
function runner(initial,month){
 const slots=[];let cursor=0,effect,reads=0,ensures=0,plan=initial;
 const react={useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],next=>{slots[i]=next;}];},useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});},useCallback:fn=>fn};
 const hook=createLoader({react,'expo-router':{useFocusEffect:fn=>{effect=fn;}},'../storage/categories':{getCategoryPlan:async()=>{reads++;return plan;}},'../storage/budgets':{ensureMonthlyLimit:async()=>{ensures++;plan={limitCentavos:500,allocations:[],signature:'[500,[]]'};}},'../lib/validation':{localDate:()=> '2026-11-12'}})('src/hooks/use-category-plan.ts').useCategoryPlan;
 return {render(){cursor=0;return hook(month);},focus:()=>effect(),get reads(){return reads;},get ensures(){return ensures;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const configured=runner({limitCentavos:1000,allocations:[],signature:'[1000,[]]'},'2026-11');configured.render();configured.focus();await tick();assert.equal(configured.ensures,0,'Existing category plan should not start a redundant monthly-copy transaction');assert.equal(configured.reads,1);assert.equal(configured.render().plan.limitCentavos,1000);
 const empty=runner({limitCentavos:null,allocations:[],signature:'[null,[]]'},'2026-11');empty.render();empty.focus();await tick();assert.equal(empty.ensures,1);assert.equal(empty.reads,2);assert.equal(empty.render().plan.limitCentavos,500,'Unset current month still copies its prior limit before displaying allocations');
 const history=runner({limitCentavos:null,allocations:[],signature:'[null,[]]'},'2026-10');history.render();history.focus();await tick();assert.equal(history.ensures,0);assert.equal(history.reads,1);assert.equal(history.render().plan.limitCentavos,null);
 console.log('Category loading checks passed: configured month uses one read/no copy transaction; absent current month still copies/reloads; historical month read-only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
