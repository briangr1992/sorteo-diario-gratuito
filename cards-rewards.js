(()=>{
  let enabled=false,csrf='',blackjackId='',warId='';
  const $=id=>document.getElementById(id);
  async function post(url,body){
    if(!csrf)csrf=(await fetch('/api/csrf',{credentials:'same-origin'}).then(r=>r.json())).csrfToken;
    const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)}),data=await response.json();
    if(!response.ok)throw new Error(data.error||'No se pudo guardar la partida.');return data;
  }
  function cardNode(card){const el=document.createElement('div');el.className='playing-card'+(['♥','♦'].includes(card.suit)?' red':'');el.textContent=card.rank+card.suit;return el}
  function showBlackjack(g){
    $('playerHand').replaceChildren(...g.player.map(cardNode));$('dealerHand').replaceChildren(...g.dealer.map(cardNode));$('playerTotal').textContent=g.playerTotal;$('dealerTotal').textContent=g.dealerTotal??'?';$('hit').disabled=!g.active;$('stand').disabled=!g.active;
    $('blackjackMessage').textContent=g.outcome==='win'?`¡Ganaste! ${g.rewardPoints?`+${g.rewardPoints} puntos`:'Llegaste al límite diario de puntos.'}`:g.outcome==='draw'?'Empate.':g.outcome==='loss'?'La banca gana.':'La partida se valida en el servidor.';
  }
  function showWar(g){
    const you=$('youCard'),bot=$('botCard');you.className='playing-card'+(['♥','♦'].includes(g.you.suit)?' red':'');bot.className='playing-card'+(['♥','♦'].includes(g.bot.suit)?' red':'');you.textContent=g.you.rank+g.you.suit;bot.textContent=g.bot.rank+g.bot.suit;$('youScore').textContent=g.youLeft;$('botScore').textContent=g.botLeft;$('cardsLeft').textContent=g.youLeft+g.botLeft;$('warDraw').disabled=!!g.outcome;
    $('warMessage').textContent=g.outcome==='win'?`¡Ganaste! ${g.rewardPoints?`+${g.rewardPoints} puntos`:'Llegaste al límite diario de puntos.'}`:g.outcome==='loss'?'Ganó el bot.':g.result==='you'?'Ganaste la ronda.':g.result==='bot'?'El bot gana la ronda.':'Empate: se reparten las cartas.';
  }
  function error(e){$('blackjackMessage').textContent=e.message;$('warMessage').textContent=e.message}
  document.addEventListener('click',async event=>{
    const id=event.target?.id;if(!enabled||!['deal','hit','stand','warStart','warDraw'].includes(id))return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      if(id==='deal'){const g=await post('/api/cards/blackjack/start',{});blackjackId=g.id;showBlackjack(g)}
      if(id==='hit'||id==='stand'){if(!blackjackId)return;showBlackjack(await post('/api/cards/blackjack/action',{gameId:blackjackId,action:id}))}
      if(id==='warStart'){const g=await post('/api/cards/war/start',{});warId=g.id;$('youScore').textContent=g.you;$('botScore').textContent=g.bot;$('cardsLeft').textContent=g.you+g.bot;$('youCard').className='playing-card back';$('botCard').className='playing-card back';$('youCard').textContent='?';$('botCard').textContent='?';$('warDraw').disabled=false;$('warMessage').textContent='Mazo barajado en el servidor. Saca una carta.'}
      if(id==='warDraw'){if(!warId)return;showWar(await post('/api/cards/war/draw',{gameId:warId}))}
    }catch(e){error(e)}
  },true);
  fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(user=>{
    enabled=!!user?.email_verified_at;
    if(!enabled){$('blackjackMessage').textContent='Puedes jugar como invitado. Verifica tu cuenta para obtener puntos por victorias validadas por el servidor.';$('warMessage').textContent='Puedes jugar como invitado. Verifica tu cuenta para obtener puntos por victorias validadas por el servidor.'}
  }).catch(()=>{});
})();
