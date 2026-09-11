/* Compact, native era navigation on phones; shares the existing timeline state. */
(() => {
    const select=document.createElement('select');
    select.id='phone-era-select';select.className='phone-era-select';
    document.querySelector('.timeline-heading').append(select);
    function render(){
        select.setAttribute('aria-label',currentLang==='ar'?'اختر الحقبة التاريخية':'Choose historical era');
        select.replaceChildren(...years.map((year,index)=>{
            const option=document.createElement('option');option.value=String(index);
            const group=getEraGroupForYear(year);
            option.textContent=`${year} · ${currentLang==='ar'?group.name_ar:group.name_en}`;
            return option;
        }));
        select.value=slider.value;
    }
    select.addEventListener('change',()=>{
        window.dispatchEvent(new Event('mosul:stop-playback'));
        updateYear(Number(select.value));
    });
    window.addEventListener('mosul:year',render);
    document.getElementById('lang-toggle-btn').addEventListener('click',render);
    document.getElementById('welcome-language').addEventListener('click',render);
    const phone=matchMedia('(max-width:600px), (max-width:950px) and (max-height:500px)');
    function resize(){
        if(phone.matches&&!document.getElementById('sidebar').classList.contains('collapsed'))document.getElementById('sidebar-toggle-btn').click();
        requestAnimationFrame(()=>{map.resize();if(typeof mapCompare!=='undefined'&&mapCompare)mapCompare.resize();});
    }
    phone.addEventListener('change',resize);
    document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&phone.matches&&!document.getElementById('sidebar').classList.contains('collapsed'))document.getElementById('sidebar-toggle-btn').click();
    });
    render();
})();
