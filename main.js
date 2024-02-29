var asteroids,
bullets,
explosions,
pickups,
asteroidReload,
asteroidReloadTime,
size,
worldSize,
pause,
pauseKey,
pauseBtns,
oldBtns,
prefers={controls:1,showArrows:true},
timer,
levelUp,
levelUpgrades,
player;
if(!localStorage.getItem("highscore")) {
  localStorage.setItem("highscore",3000);
}
var upgrades = [
  {name:"Speed",f:()=>player.speed+=0.2,weight:1,description:"You move faster",max:15},
  {name:"Multishot",f:()=>player.multishot+=1,weight:0.3,description:"Shoot more bullets",max:10},
  {name:"Reload",f:()=>player.reloadTime*=0.85,weight:0.8,description:"Shoot faster",max:10},
  {name:"Health",f:()=>{player.maxHp++;player.hp=player.maxHp},weight:0.9,description:"More max health",max:5},
  {name:"Projectile Speed",f:()=>player.projectileSpeed+=2,weight:1,description:"Your bullets move faster",max:10}
];
var picks = [
  {
    col:"rgb(220,50,0)",
    weight:1,
    collect:()=>{player.hp++;player.score+=350;},
    draw:()=>{
      fill("rgb(220,50,0)");
      stroke("rgb(190,40,0)");
      strokeWeight(5);
      beginShape();
      vertex(0,10);
      vertex(-13,-5);
      vertex(-6,-11);
      vertex(0,-5);
      vertex(6,-11);
      vertex(13,-5);
      vertex(0,10);
      endShape();
  }},
  {
    col:"rgb(50,150,250)",
    weight:0.7,
    collect:()=>{player.shield=true;player.score+=350;},
    draw:()=>{
      fill("rgb(50,150,250)");
      stroke("rgb(50,130,220)");
      strokeWeight(5);
      beginShape();
      vertex(0,10);
      vertex(-10,0);
      vertex(-10,-10);
      vertex(10,-10);
      vertex(10,0);
      vertex(0,10);
      endShape();
  }},
  {col:"rgb(230,200,50)", weight:0.3, collect:()=>{player.score+=1000;player.xp+=35},
    draw:()=>{
      fill("rgb(230,200,50)");
      stroke("rgb(200,180,40)");
      strokeWeight(5);
      circle(0,0,25);
      stroke("rgb(210,190,40)");
      line(0,-5,0,5);
  }}
];

function setup() {
  upgrades.forEach((e) => {
    e.times = 0;
  });
  pause = false;
  pauseKey = false;
  levelUp = false;
  pauseBtns = [];
  oldBtns = [];
  asteroids = [];
  bullets = [];
  explosions = [];
  pickups = [];
  asteroidReload = 0;
  asteroidReloadTime = 250;
  asteroidSpeed = 2;
  timer = 0;
  worldSize = v(1500,1500);
  size = v(innerWidth,innerHeight);
  if(size.x>worldSize.x-10) size.x=worldSize.x-10;
  if(size.y>worldSize.y-10) size.y=worldSize.y-10;
  createCanvas(size.x,size.y);
  asteroids.push({pos:v(200,200),vel:v(3,2),size:40,hp:2});
  
  player = {};
  player.pos = v(0,0);
  player.vel = v(0,0);
  player.dir = 0;
  player.dirVel = 0;
  player.reload = 0;
  player.hp = 5;
  player.maxHp = 5;
  player.alive = true;
  player.restart = false;
  player.score = 0;
  player.iframe = 0;
  player.xp = 0;
  player.lvlUp = 50;
  player.lvl = 0;
  player.speed = 0.4;
  player.multishot = 1;
  player.reloadTime = 5;
  player.spread = 0.1;
  player.shield = false;
  player.projectileSpeed = 15;
  frameRate(1000);
  
  // testing, all pickups
  for(let i = 0; i < picks.length; i++) {
    pickups.push({pos:v(i*100-picks.length*50+50,-100),type:i})
  }
}

function draw() {
  if(!pause && !levelUp) {
    if(asteroidReload<=0 && player.alive) {
      asteroidReload = asteroidReloadTime;
      asteroidReloadTime*=0.95;
      if(asteroidReloadTime<30) asteroidReloadTime = 30;
      asteroidSpeed += 0.2;
      asteroids.push({
        pos:p5.Vector.add(player.pos,v(size.x/2,0).rotate(random()*2*PI-PI)),
        vel:v(random()*asteroidSpeed+asteroidSpeed,0).rotate(random()*2*PI-PI),
        size:40,hp:2+floor(timer/300)});
    } else {
      asteroidReload-=0.03*deltaTime;
    }
    player.pos.add(p5.Vector.mult(player.vel,deltaTime*0.03));
    player.vel.mult(0.95);
    if(player.alive) {
      timer += deltaTime*0.001;
      let joy = v(keyIsDown(68)-keyIsDown(65), keyIsDown(83)-keyIsDown(87)).normalize();
      if(prefers.controls==0) {
        let dst = v(joy.y,0).rotate(player.dir).mult(-player.speed);
        player.vel.add(dst);
        player.dirVel += joy.x*0.03;
        player.dir += player.dirVel*deltaTime*0.03;
        player.dirVel *= 0.9;
      } else if (prefers.controls==1) {
        player.vel.add(p5.Vector.mult(joy,player.speed+0.1));
        player.dir = p5.Vector.sub(v(mouseX,mouseY),p5.Vector.div(size,2)).heading();
      }
      player.iframe-=deltaTime*0.03;
      if(player.pos.x>worldSize.x/2) {
        player.pos.x -= worldSize.x;
      }
      if(player.pos.y>worldSize.y/2) {
        player.pos.y -= worldSize.y;
      }
      if(player.pos.x<-worldSize.x/2) {
        player.pos.x += worldSize.x;
      }
      if(player.pos.y<-worldSize.y/2) {
        player.pos.y += worldSize.y;
      }
      if(player.hp>player.maxHp) player.hp = player.maxHp;
      if(player.xp>player.lvlUp) {
        player.lvl++;
        player.xp -=player.lvlUp;
        player.lvlUp += 10;
        player.lvlUp *= 1.1;
        player.score += 1000;
        player.hp+=2;
        levelUp = true;
        let choices = [];
        upgrades.forEach((e,i) => {
          for(let n = 0; n < e.weight*20; n++) {
            choices.push({name:e.name,f:e.f,description:e.description,i:i});
          }
        });
        levelUpgrades = [];
        for(let n = 0; n < 3; n++) {
          let r = floor(random()*choices.length);
          levelUpgrades.push(choices[r]);
          choices = choices.filter(e=>e.name!=choices[r].name);
        }
      }
      if((keyIsDown(32) || mouseIsPressed) && player.reload<=0) {
        let num = round(player.multishot);
        for(let i = 0; i < num; i++) {
          bullets.push({
            pos:player.pos.copy(),
            vel:p5.Vector.add(player.vel,v(player.projectileSpeed,0) .rotate(player.dir+i*player.spread-player.spread*(num-1)/2)),
            dst:v(0,0),
            playerVel:player.vel.copy(),
            dmg:0.7/(1+abs(i-(num-1)/2))+0.3
          });
          bullets[bullets.length-1].pos.add(p5.Vector.sub(bullets[bullets.length-1].vel,player.vel));
        }
        player.reload = player.reloadTime;
      } else {
        player.reload-=deltaTime*0.03;
      }
      if(player.hp<=0) {
        player.alive = false;
        explosions.push({pos:player.pos.copy(),vel:player.vel.copy(),size:20,tick:0});
        bullets = [];
        if(player.score>=parseInt(localStorage.getItem("highscore"))) localStorage.setItem("highscore",player.score);
      }
    }

    asteroids.forEach((e,i) => {
      if(e.vel.mag()>10) {
        e.vel.normalize();
        e.vel.mult(10);
      }
      e.pos.add(e.vel);
      if(e.pos.x>worldSize.x/2) {
        e.pos.x -= worldSize.x;
      }
      if(e.pos.y>worldSize.y/2) {
        e.pos.y -= worldSize.y;
      }
      if(e.pos.x<-worldSize.x/2) {
        e.pos.x += worldSize.x;
      }
      if(e.pos.y<-worldSize.y/2) {
        e.pos.y += worldSize.y;
      }
      
      if(player.alive) {
        let dst = p5.Vector.sub(e.pos,player.pos);
        if(dst.mag()<e.size/2+25+player.shield*10) {
          if(player.iframe<=0) {
            if(player.shield) player.shield = false;
            else player.hp--;
            e.hp--;
          }
          player.iframe = 10;
          dst = dst.normalize();
          dst.mult(e.size+15);
          e.pos = player.pos.copy();
          e.pos.add(dst);
          e.vel.sub(player.vel);
          e.vel.reflect(dst);
          e.pos.add(e.vel);
          e.vel.add(player.vel);
          if(e.hp<=0) {
            astSplit(e.pos,dst.heading()+PI,e.size,e.vel,e.size+15);
            asteroids.splice(i,1);
            i--;
          }
        }
      }
    });
    bullets.forEach((e,i) => {
      e.pos.add(p5.Vector.mult(e.vel,deltaTime*0.03));
      e.dst.add(p5.Vector.mult(p5.Vector.sub(e.vel,player.vel),deltaTime*0.03));
      let s = -e.vel.mag();
      if(e.dst.x>worldSize.x/2+s || e.dst.y>worldSize.y/2+s || e.dst.x<-worldSize.x/2-s || e.dst.y<-worldSize.y/2-s) {
        bullets.splice(i,1);
      } else {
        if(e.pos.x>worldSize.x/2) {
          e.pos.x -= worldSize.x;
        }
        if(e.pos.y>worldSize.y/2) {
          e.pos.y -= worldSize.y;
        }
        if(e.pos.x<-worldSize.x/2) {
          e.pos.x += worldSize.x;
        }
        if(e.pos.y<-worldSize.y/2) {
          e.pos.y += worldSize.y;
        }
        asteroids.forEach((t,ti) => {
          let dst = p5.Vector.sub(e.pos,t.pos);
          if(dst.mag()<t.size/2+10) {
            bullets.splice(i,1);
            i--;
            t.hp-=e.dmg;
            if(t.hp<=0) {
              astSplit(t.pos.copy(),e.vel.heading(),t.size,t.vel.copy(),t.size);
              asteroids.splice(ti,1);
              ti--;
            }
          }
        });
      }
    });
    explosions.forEach((e,i) => {
      e.tick+=deltaTime*0.03;
      if(e.tick>=2+e.size/4) {
        explosions.splice(i,1);
      }
    });
  }
  if(keyIsDown(27)&&!pauseKey) {
    pause = !pause;
  }
  if(levelUp) {
    pause=false;
  }
  
  background(0);
  stroke(150);
  strokeWeight(1);
  let s = 100;
  for(let x = (Math.round(s-player.pos.x)%s+s)%s; x <= size.x; x+=s) {
    line(x,0,x,size.y);
  }
  for(let y = (Math.round(s-player.pos.y)%s+s)%s; y <= size.y; y+=s) {
    line(0,y,size.x,y);
  }
  stroke(255);
  strokeWeight(5);
  noFill();
  push();
  translate(size.x/2,size.y/2);
  push();
  translate(-player.pos.x,-player.pos.y);
  pickups.forEach((e) => {e.closest = v(0,0)});
  for(let xOff=-worldSize.x; xOff<=worldSize.x; xOff+=worldSize.x) {
    for(let yOff=-worldSize.y; yOff<=worldSize.y; yOff+=worldSize.y) {
      push();
      translate(xOff,yOff);
      explosions.forEach((e,i) => {
        fill(255);
        stroke(255);
        stroke(200);
        ellipse(e.pos.x,e.pos.y,e.tick*e.size,e.tick*e.size);
      });
      stroke(255);
      strokeWeight(5);
      noFill();
      asteroids.forEach((e) => {
        ellipse(e.pos.x,e.pos.y,e.size,e.size);
      });
      bullets.forEach((e) => {
        line(e.pos.x, e.pos.y, e.pos.x-(e.vel.x-e.playerVel.x), e.pos.y-(e.vel.y-e.playerVel.y));
      });
      pickups.forEach((e,i) => {
        push();
        translate(e.pos);
        picks[e.type].draw();
        pop();
        let pos = p5.Vector.add(e.pos,v(xOff,yOff));
        if(p5.Vector.sub(pos,player.pos).mag()<=50) {
          pickups.splice(i,1);
          picks[e.type].collect();
        }
        if(p5.Vector.sub(pos,player.pos).mag()<p5.Vector.sub(p5.Vector.add(e.pos,e.closest),player.pos)) {
          e.closest = v(xOff,yOff);
        }
      });
      pop();
    }
  }
  pop();
  if(player.alive) {
    push();
    rotate(player.dir);
    push();
    if(prefers.controls==0) {
      strokeWeight(2);
      for(let dst = 30; dst < 500; dst+=10) {
        stroke("rgba(255,255,255,"+75/(dst+60)+")");
        line(dst,0,dst+5,0);
      }
    }
    pop();
    if(player.iframe>0) fill(255);
    else fill(0);
    triangle(-15,-15,-15,15,20,0);
    if(player.shield) {
      fill("rgba(50,200,250,0.3)");
      stroke("rgb(0,150,250)");
      strokeWeight(5);
      circle(0,0,65);
    }
    pop();
  }
  if(player.alive) {
    if(prefers.showArrows) {
      pickups.forEach((e) => {
        let pos = p5.Vector.add(e.pos,e.closest);
        let dif = p5.Vector.sub(player.pos,pos);
        let render = false;
        let s = p5.Vector.sub(size,v(20,20));
        if(dif.x <= -s.x/2) {
          render = true;
          dif.div(dif.x/(-s.x/2));
        }
        if(dif.y <= -s.y/2) {
          render = true;
          dif.div(dif.y/(-s.y/2));
        }
        if(dif.x >= s.x/2) {
          render = true;
          dif.div(dif.x/(s.x/2));
        }
        if(dif.y >= s.y/2) {
          render = true;
          dif.div(dif.y/(s.y/2));
        }
        if(render) {
          push();
          translate(p5.Vector.mult(dif,-1));
          rotate(dif.heading());
          fill(picks[e.type].col);
          noStroke();
          triangle(10,-10,10,10,-15,0);
          pop();
        }
      });
    }
  }
  pop();
  if(player.alive) {
    for(let i = 0; i < player.maxHp; i++) {
      fill(player.hp>=(i+1)?255:0);
      stroke(255);
      strokeWeight(3);
      push();
      translate(30+i*35,25);
      beginShape();
      vertex(0,15);
      vertex(-13,2);
      vertex(-7,-4);
      vertex(0,2);
      vertex(7,-4);
      vertex(13,2);
      vertex(0,15);
      endShape();
      pop();
    }
    
    fill(255);
    stroke(255);
    strokeWeight(1);
    textSize(20);
    textAlign(LEFT);
    textFont("monospace");
    textStyle(NORMAL);
    text(player.score,20,90);
    text("Level "+(player.lvl+1),20,110);
    
    fill(0);
    stroke(255);
    strokeWeight(2);
    rect(20,54,160,10);
    fill(255);
    rect(20,54,160*player.xp/player.lvlUp,10);
    
    textSize(40);
    textAlign(CENTER);
    let sec = floor(timer%60).toString();
    text(`${floor(timer/60)}:${sec.length==1?"0"+sec:sec}`,size.x/2,40);
    
    fill("rgba(0,0,0,0.5)");
    stroke(250);
    strokeWeight(3);
    rect(size.x-160,size.y-160,150,150);
    push();
    translate(size.x-85,size.y-85);
    scale(150/worldSize.x);
    
    strokeWeight(10);
    fill("rgba(0,0,0,0.5)");
    for(let x = -worldSize.x; x <= worldSize.x; x+=worldSize.x) {
      for(let y = -worldSize.y; y <= worldSize.y; y+=worldSize.y) {
        let x1 = player.pos.x-size.x/2+x;
        if(x1>worldSize.x/2) x1 = worldSize.x/2;
        if(x1<-worldSize.x/2) x1 = -worldSize.x/2;
        let y1 = player.pos.y-size.y/2+y;
        if(y1>worldSize.y/2) y1 = worldSize.y/2;
        if(y1<-worldSize.y/2) y1 = -worldSize.y/2;
        let x2 = player.pos.x+size.x/2+x;
        if(x2>worldSize.x/2) x2 = worldSize.x/2;
        if(x2<-worldSize.x/2) x2 = -worldSize.x/2;
        let y2 = player.pos.y+size.y/2+y;
        if(y2>worldSize.y/2) y2 = worldSize.y/2;
        if(y2<-worldSize.y/2) y2 = -worldSize.y/2;
        rect(x1,y1,x2-x1,y2-y1);
      }
    }
    
    strokeWeight(5);
    fill(255);
    asteroids.forEach((e) => {
      ellipse(e.pos.x,e.pos.y,e.size,e.size);
    });
    pickups.forEach((e) => {
      fill(picks[e.type].col);
      circle(e.pos.x,e.pos.y,40);
    });
    push();
    translate(player.pos);
    rotate(player.dir);
    fill(255);
    triangle(-20,-25,-20,25,35,0);
    pop();
    pop();
  } else {
    fill(255);
    stroke(0);
    strokeWeight(5);
    textAlign(CENTER);
    textStyle(BOLD);
    textFont("monospace");
    textSize(70);
    text("You Died",size.x/2,size.y/2-30);
    textSize(30);
    if(player.score>=parseInt(localStorage.getItem("highscore"))) {
      text("New highscore! "+player.score,size.x/2,size.y/2+20);
      text("Press space to restart",size.x/2,size.y/2+60);
    } else {
      text("Your score: "+player.score,size.x/2,size.y/2+20);
      text("Highscore: "+localStorage.getItem("highscore"),size.x/2,size.y/2+60);
      text("Press space to restart",size.x/2,size.y/2+100);
    }
    if(keyIsDown(32) && !player.restart) {
      setup();
    }
  }
  
  if(pause||levelUp) {
    fill("rgba(0,0,0,0.5)");
    noStroke();
    rect(0,0,size.x,size.y);
    
    stroke(0);
    strokeWeight(0);
    pauseBtns = [];
    if(pause) {
      button("Resume",120,0,0,() => {
        pause = false;
      });
      let controlLayouts = ["AD Turning","Mouse+WASD"];
      button(controlLayouts[prefers.controls],210,1,0,() => {
        prefers.controls++;
        if(prefers.controls>controlLayouts.length-1) {
          prefers.controls-=controlLayouts.length;
        }
      });
      button("Quit",260,2,0,() => {
        player.hp = 0;
        pause = false;
      });
      button(prefers.showArrows?"Yes":"No",360,3,0,() => {
        prefers.showArrows = !prefers.showArrows;
      });
      
      textSize(40);
      textAlign(CENTER);
      textStyle(NORMAL);
      textFont("monospace");
      fill(255);
      stroke(255);
      strokeWeight(1);
      text("Paused",size.x/2,100);
      
      textSize(25);
      text("Control Layout:",size.x/2,200);
      text("Show Arrows:",size.x/2,350);
    }
    if(levelUp) {
      textSize(40);
      textAlign(CENTER);
      textStyle(NORMAL);
      textFont("monospace");
      fill(255);
      stroke(255);
      strokeWeight(1);
      text("Level Up!",size.x/2,100);
      levelUpgrades.forEach((e,i) => {
        button(e.name,120+i*65,i,1,() => {
          e.f();
          upgrades[e.i].times++;
          levelUp = false;
        },e.description);
      });
      if(levelUpgrades.length==0) {
        button("Next",120,0,1,()=>{
          levelUp = false;
          player.score += 2000;
        },"Adds 2000 xp");
      }
    }
    oldBtns = pauseBtns;
  }
  fill(255);
  stroke(255);
  strokeWeight(0.5);
  textSize(15);
  textAlign(RIGHT);
  textFont("monospace");
  textStyle(NORMAL);
  text(round(1000/deltaTime),size.x-10,20);
  
  
  stroke(250);
  strokeWeight(4);
  push();
  translate(mouseX,mouseY);
  if(prefers.controls==1 && !pause && !levelUp) {
    line(-15,-10,-10,-15);
    line(15,10,10,15);
    line(-15,10,-10,15);
    line(15,-10,10,-15);
    line(-5,0,5,0);
    line(0,-5,0,5);
    canvas.style.cursor = "none";
  } else {
    canvas.style.cursor = "unset";
  }
  pop();
  
  player.restart = keyIsDown(32);
  pauseKey = keyIsDown(27);
}
function v(x,y) {
  return createVector(x,y);
}
function astSplit(pos,dir,size,vel,dst) {
  explosions.push({pos:pos.copy(),vel:vel.copy(),tick:0,size:size/3});
  player.score += size>35?150:(size>25?100:75);
  player.xp += size>35?2:1;
  if(size>35 && random()>0.5) {
    asteroidReload = 0;
  }
  if(random()<(size/100-0.2)*100/(timer+200)+0.01) {
    let choices = [];
    picks.forEach((e,i) => {
      for(let n=0; n<e.weight*20; n++) choices.push(i);
    });
    pickups.push({type:floor(random()*picks.length),pos:pos});
  }
  if(size>=25) {
    let num = 3;//+Math.round(random());
    for(let i = -1; i<=1; i+=2/(num-1)) {
      asteroids.push({
        pos:pos.copy(),
        vel:p5.Vector.add(vel, v(3,0) .rotate(dir+i)),
        size:size/4*3,
        hp:1+floor(timer/300)*0.5
      });
      asteroids[asteroids.length-1].pos.add(
        p5.Vector.mult(p5.Vector.sub(asteroids[asteroids.length-1].vel,vel),dst/6)
      );
    }
  }
}
function button(txt,yPos,i,style,fun,desc) {
  textSize(30);
  textAlign(CENTER);
  textStyle(NORMAL);
  textFont("monospace");
  let w,h;
  if(style==0) {
    w = textWidth(txt)+15;
    h = 40;
  } else if(style==1) {
    w = 300;
    h = 60;
  }
  let hover = (mouseX>size.x/2-w/2&&mouseY>yPos && mouseX<size.x/2+w/2&&mouseY<yPos+h);
  pauseBtns.push(hover&&mouseIsPressed);
  if(style==0) {
    fill(hover?130:110);
    rect(size.x/2-w/2,yPos,w,h,10);
    fill(255);
    text(txt,size.x/2,yPos+30);
  } else if(style==1) {
    fill(hover?90:70);
    rect(size.x/2-w/2,yPos,w,h,5);
    fill(255);
    text(txt,size.x/2,yPos+30);
    textSize(15);
    text(desc,size.x/2,yPos+50);
  }
  if(hover&&mouseIsPressed&&!oldBtns[i]) {
    fun();
  }
}
window.onblur = () => {
  if(!levelUp) pause = true;
}
