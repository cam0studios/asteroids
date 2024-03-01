var asteroids,
  bullets,
  explosions,
  asteroidSpawnTimer,
  asteroidSpawnRate,
  size,
  pause,
  pauseKey,
  pauseBtns,
  oldBtns,
  prefers = { controls: 1, showArrows: true, doScreenshake: true },
  timer,
  levelUp,
  levelUpgrades,
  player,
  world = {
    size: null,
    pickups: [],
    screenshake: {
      intensityX: 0,
      intensityY: 0,
      timeRemaining: 0,
      set: (x, y, time) => {
        world.screenshake.intensityX = x
        world.screenshake.intensityY = y
        world.screenshake.timeRemaining = time
      }
    }
  };

const screenshakeModifier = 0.225
if (!localStorage.getItem("highscore")) {
  localStorage.setItem("highscore", 0);
}
const upgrades = [
  { name: "Speed", f: () => player.speed += 0.2, weight: 1, description: "Your ship moves faster", max: 15 },
  { name: "Multishot", f: () => player.multishot += 1, weight: 0.3, description: "Shoot more bullets", max: 10 },
  { name: "Fire rate", f: () => player.reloadTime *= 0.85, weight: 0.8, description: "Shoot faster", max: 10 },
  { name: "Health", f: () => { player.maxHp++; player.hp += 2; }, weight: 0.9, description: "Increases your max health by 1", max: 5 },
  { name: "Projectile Speed", f: () => player.projectileSpeed += 2, weight: 1, description: "Your bullets move faster", max: 10 },
  { name: "Damage", f: () => player.dmg+=0.3, weight: 0.6, description: "Your bullets do more damage", max: 10 },
  // { name: "Projectile Size", f: () => player.projectileSize += 3, weight: 0.9, description: "Your bullets are larger", max: 4}
];
const pickupData = [
  {
    col: "rgb(220, 50, 0)",
    weight: 1,
    collect: () => { player.hp++; player.score += 350; },
    draw: () => {
      fill("rgb(220, 50, 0)");
      stroke("rgb(190, 40, 0)");
      strokeWeight(5);
      beginShape();
      vertex(0, 10);
      vertex(-13, -5);
      vertex(-6, -11);
      vertex(0, -5);
      vertex(6, -11);
      vertex(13, -5);
      vertex(0, 10);
      endShape();
    }
  },
  {
    col: "rgb(50,150,250)",
    weight: 0.7,
    collect: () => { player.shield = true; player.score += 350; },
    draw: () => {
      fill("rgb(50, 150, 250)");
      stroke("rgb(50, 130, 220)");
      strokeWeight(5);
      beginShape();
      vertex(0, 10);
      vertex(-10, 0);
      vertex(-10, -10);
      vertex(10, -10);
      vertex(10, 0);
      vertex(0, 10);
      endShape();
    }
  },
  {
    col: "rgb(230, 200, 50)",
    weight: 0.3,
    collect: () => { player.score += 1000; player.xp += Math.max(75, Math.floor(player.lvlUp / 10)) },
    draw: () => {
      fill("rgb(230, 200, 50)");
      stroke("rgb(200, 180, 40)");
      strokeWeight(5);
      circle(0, 0, 25);
      stroke("rgb(210, 190, 40)");
      line(0, -5, 0, 5);
    }
  }
];

function setup() {
  upgrades.forEach((e) => {
    e.times = 0;
  });

  pause = false;
  pauseKey = false;
  levelUp = false;
  levelUpgrades = [];
  pauseBtns = [];
  oldBtns = [];
  asteroids = [];
  bullets = [];
  explosions = [];
  world.pickups = [];
  asteroidSpawnTimer = 0;
  asteroidSpawnRate = 250;
  asteroidSpeed = 2;
  timer = 0;
  world.size = v(3000, 3000);
  size = v(innerWidth, innerHeight);
  if (size.x > world.size.x - 10) size.x = world.size.x - 10;
  if (size.y > world.size.y - 10) size.y = world.size.y - 10;

  createCanvas(size.x, size.y);
  asteroids.push({ pos: v(200, 200), vel: v(3, 2), size: 40, hp: 2 });

  player = {
    pos: v(0, 0),
    vel: v(0, 0),
    dir: 0,
    dirVel: 0,
    reload: 0,
    hp: 5,
    maxHp: 5,
    alive: true,
    restart: false,
    score: 0,
    iframe: 0,
    xp: 0,
    lvlUp: 50,
    lvl: 0,
    speed: 0.4,
    multishot: 1,
    reloadTime: 5,
    spread: 0.1,
    shield: false,
    projectileSpeed: 15,
    projectileSize: 5,
    dmg: 1
  };
  frameRate(1000);

  // testing, all pickups
  // for (let i = 0; i < pickupData.length; i++) {
  //   world.pickups.push({ pos: v(i * 100 - pickupData.length * 50 + 50, -100), type: i })
  // }
}

function draw() {
  if (!pause && !levelUp) {
    if (asteroidSpawnTimer <= 0 && player.alive) {
      asteroidSpawnTimer = asteroidSpawnRate;
      asteroidSpawnRate *= 0.925;
      if (asteroidSpawnRate < 20) asteroidSpawnRate = 20;
      asteroidSpeed += 0.005;
      asteroids.push({
        pos: p5.Vector.add(player.pos, v(size.x / 2, 0).rotate(random() * 2 * PI - PI)),
        vel: v(random() * asteroidSpeed + asteroidSpeed, 0).rotate(random() * 2 * PI - PI),
        size: 40, hp: 2 + floor(timer / 300)
      });
    } else {
      asteroidSpawnTimer -= 0.03 * deltaTime;
    }
    player.pos.add(p5.Vector.mult(player.vel, deltaTime * 0.03));
    player.vel.mult(0.95);
    if (player.alive) {
      timer += deltaTime * 0.001;
      let joy = v(keyIsDown(68) - keyIsDown(65), keyIsDown(83) - keyIsDown(87)).normalize();
      if (prefers.controls == 0) {
        let dst = v(joy.y, 0).rotate(player.dir).mult(-player.speed);
        player.vel.add(dst);
        player.dirVel += joy.x * 0.03;
        player.dir += player.dirVel * deltaTime * 0.03;
        player.dirVel *= 0.9;
      } else if (prefers.controls == 1) {
        player.vel.add(p5.Vector.mult(joy, player.speed + 0.1));
        player.dir = p5.Vector.sub(v(mouseX, mouseY), p5.Vector.div(size, 2)).heading();
      }
      player.iframe -= deltaTime * 0.03;
      if (player.pos.x > world.size.x / 2) {
        player.pos.x -= world.size.x;
      }
      if (player.pos.y > world.size.y / 2) {
        player.pos.y -= world.size.y;
      }
      if (player.pos.x < -world.size.x / 2) {
        player.pos.x += world.size.x;
      }
      if (player.pos.y < -world.size.y / 2) {
        player.pos.y += world.size.y;
      }
      if (player.hp > player.maxHp) player.hp = player.maxHp;
      if (player.xp > player.lvlUp) {
        player.lvl++;
        player.xp -= player.lvlUp;
        player.lvlUp += 5;
        player.lvlUp *= 1.1;
        player.score += 1000;
        player.hp += 1;
        levelUp = true;
      }
      if(levelUp && levelUpgrades.length==0) {
        let choices = [];
        upgrades.forEach((e, i) => {
          if(e.times<e.max) {
            for (let n = 0; n < e.weight * 20; n++) {
              choices.push({ name: e.name, f: e.f, description: e.description, i: i });
            }
          }
        });
        levelUpgrades = [];
        for (let n = 0; n < 3; n++) {
          let r = floor(random() * choices.length);
          levelUpgrades.push(choices[r]);
          choices = choices.filter(e => e.name != choices[r].name);
        }
      }
      if ((keyIsDown(32) || mouseIsPressed) && player.reload <= 0) {
        let num = round(player.multishot);
        for (let i = 0; i < num; i++) {
          bullets.push({
            pos: player.pos.copy(),
            vel: v(player.projectileSpeed, 0).rotate(player.dir + i * player.spread - player.spread * (num - 1) / 2),
            dst: v(0, 0),
            dmg: player.dmg * (0.7 / (1 + abs(i - (num - 1) / 2)) + 0.3)
          });
          bullets[bullets.length - 1].pos.add(bullets[bullets.length - 1].vel);
        }
        player.reload = player.reloadTime;
      } else {
        player.reload -= deltaTime * 0.03;
      }
      if (player.hp <= 0) {
        player.alive = false;
        world.screenshake.set(8, 8, 1)
        explosions.push({ pos: player.pos.copy(), vel: player.vel.copy(), size: 20, tick: 0 });
        bullets = [];
        if (player.score >= parseInt(localStorage.getItem("highscore"))) localStorage.setItem("highscore", player.score);
      }
    }

    asteroids.forEach((e, i) => {
      if (e.vel.mag() > 10) {
        e.vel.normalize();
        e.vel.mult(10);
      }
      e.pos.add(e.vel);
      if (e.pos.x > world.size.x / 2) {
        e.pos.x -= world.size.x;
      }
      if (e.pos.y > world.size.y / 2) {
        e.pos.y -= world.size.y;
      }
      if (e.pos.x < -world.size.x / 2) {
        e.pos.x += world.size.x;
      }
      if (e.pos.y < -world.size.y / 2) {
        e.pos.y += world.size.y;
      }

      if (player.alive) {
        let dst = p5.Vector.sub(e.pos, player.pos);
        if (dst.mag() < e.size / 2 + 25 + player.shield * 10) {
          if (player.iframe <= 0) {
            if (player.shield) player.shield = false;
            else player.hp--;
            e.hp--;
          }
          player.iframe = 10;
          dst = dst.normalize();
          dst.mult(e.size + 15);
          e.pos = player.pos.copy();
          e.pos.add(dst);
          e.vel.sub(player.vel);
          e.vel.reflect(dst);
          e.pos.add(e.vel);
          e.vel.add(player.vel);
          if (e.hp <= 0) {
            astSplit(e.pos, dst.heading() + PI, e.size, e.vel, e.size + 15);
            asteroids.splice(i, 1);
            i--;
          }
        }
      }
    });
    tickBullets();
    explosions.forEach((e, i) => {
      e.tick += deltaTime * 0.03;
      if (e.tick >= 2 + e.size / 3) {
        explosions.splice(i, 1);
      }
    });
  }
  if (keyIsDown(27) && !pauseKey) {
    pause = !pause;
  }
  if (levelUp) {
    pause = false;
  }


  background(0);
  stroke(150);
  strokeWeight(1);
  let s = 100;
  for (let x = (Math.round(s - player.pos.x) % s + s) % s; x <= size.x; x += s) {
    line(x, 0, x, size.y);
  }
  for (let y = (Math.round(s - player.pos.y) % s + s) % s; y <= size.y; y += s) {
    line(0, y, size.x, y);
  }
  //calculating screenshake
  let screenModX = random(-world.screenshake.intensityX, world.screenshake.intensityX)
  let screenModY = random(-world.screenshake.intensityY, world.screenshake.intensityY)

  world.screenshake.timeRemaining -= deltaTime / 1000
  if (world.screenshake.timeRemaining > 0 && prefers.doScreenshake) {
    translate(screenModX, screenModY)
  }
  stroke(255);
  strokeWeight(5);
  noFill();
  push();
  translate(size.x / 2, size.y / 2);
  push();
  translate(-player.pos.x, -player.pos.y);
  world.pickups.forEach((e) => { e.closest = v(0, 0) });
  for (let xOff = -world.size.x; xOff <= world.size.x; xOff += world.size.x) {
    for (let yOff = -world.size.y; yOff <= world.size.y; yOff += world.size.y) {
      push();
      translate(xOff, yOff);
      explosions.forEach((e, i) => {
        fill(255);
        stroke(255);
        stroke(200);
        ellipse(e.pos.x, e.pos.y, e.tick * e.size, e.tick * e.size);
      });
      stroke(255);
      strokeWeight(5);
      noFill();
      asteroids.forEach((a) => {
        ellipse(a.pos.x, a.pos.y, a.size, a.size);
      });
      bullets.forEach((b) => {
        strokeWeight(player.projectileSize);
        line(b.pos.x, b.pos.y, b.pos.x - b.vel.x, b.pos.y - b.vel.y);
      });
      world.pickups.forEach((pickup, i) => {
        push();
        translate(pickup.pos);
        pickupData[pickup.type].draw();
        pop();
        let pos = p5.Vector.add(pickup.pos, v(xOff, yOff));
        if (p5.Vector.sub(pos, player.pos).mag() <= 50) {
          world.pickups.splice(i, 1);
          pickupData[pickup.type].collect();
        }
        if (p5.Vector.sub(pos, player.pos).mag() < p5.Vector.sub(p5.Vector.add(pickup.pos, pickup.closest), player.pos)) {
          pickup.closest = v(xOff, yOff);
        }
      });
      pop();
    }
  }
  pop();
  if (player.alive) {
    push();
    rotate(player.dir);
    push();
    if (prefers.controls == 0) {
      strokeWeight(2);
      for (let dst = 30; dst < 500; dst += 10) {
        stroke("rgba(255, 255, 255, " + 75 / (dst + 60) + ")");
        line(dst, 0, dst + 5, 0);
      }
    }
    pop();
    if (player.iframe > 0) fill(255);
    else fill(0);
    triangle(-15, -15, -15, 15, 20, 0);
    if (player.shield) {
      fill("rgba(50, 200, 250, 0.3)");
      stroke("rgb(0, 150, 250)");
      strokeWeight(5);
      circle(0, 0, 65);
    }
    pop();
  }
  if (player.alive) {
    drawPointerArrows();
  }
  pop();

  player.alive ? drawHUD() : drawDeathScreen()

  if (pause || levelUp) {
    fill("rgba(0, 0, 0, 0.5)");
    noStroke();
    rect(0, 0, size.x, size.y);

    stroke(0);
    strokeWeight(0);
    pauseBtns = [];
    if (pause) {
      drawPauseMenu();
    }
    if (levelUp) {
      drawLevelUpScreen();
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
  text(round(1000 / deltaTime), size.x - 10, 20);


  stroke(250);
  strokeWeight(4);
  push();
  translate(mouseX, mouseY);
  if (prefers.controls == 1 && !pause && !levelUp) {
    line(-15, -10, -10, -15);
    line(15, 10, 10, 15);
    line(-15, 10, -10, 15);
    line(15, -10, 10, -15);
    line(-5, 0, 5, 0);
    line(0, -5, 0, 5);
    canvas.style.cursor = "none";
  } else {
    canvas.style.cursor = "unset";
  }
  pop();

  player.restart = keyIsDown(32);
  pauseKey = keyIsDown(27);
}

function tickBullets() {
  bullets.forEach((bullet, i) => {
    bullet.pos.add(p5.Vector.mult(bullet.vel, deltaTime * 0.03));
    bullet.dst.add(p5.Vector.mult(p5.Vector.sub(bullet.vel, player.vel), deltaTime * 0.03));
    let s = -bullet.vel.mag();
    if (bullet.dst.x > world.size.x / 2 + s || bullet.dst.y > world.size.y / 2 + s || bullet.dst.x < -world.size.x / 2 - s || bullet.dst.y < -world.size.y / 2 - s) {
      bullets.splice(i, 1);
    } else {
      bullet.pos.x = (bullet.pos.x + world.size.x / 2) % world.size.x - world.size.x / 2;
      bullet.pos.y = (bullet.pos.y + world.size.y / 2) % world.size.y - world.size.y / 2;
      asteroids.forEach((asteroid, ti) => {
        let baseDst = p5.Vector.sub(bullet.pos, asteroid.pos);
        let run = true;
        for(let offX = -world.size.x; offX <= world.size.x; offX += world.size.x) {
          for(let offY = -world.size.y; offY <= world.size.y; offY += world.size.y) {
            if(run) {
              let dst = p5.Vector.add(baseDst,v(offX,offY));
              if (dst.mag() < asteroid.size / 2 + 10 + player.projectileSize * 1.2) {
                bullets.splice(i, 1);
                run = false;
                i--;
                asteroid.hp -= bullet.dmg;
                if (asteroid.hp <= 0) {
                  astSplit(asteroid.pos.copy(), bullet.vel.heading(), asteroid.size, asteroid.vel.copy(), asteroid.size);
                  asteroids.splice(ti, 1);
                  ti--;
                }
              }
            }
          }
        }
      });
    }
  });
}

function drawLevelUpScreen() {
  textSize(40);
  textAlign(CENTER);
  textStyle(NORMAL);
  textFont("monospace");
  fill(255);
  stroke(255);
  strokeWeight(1);
  text("Level Up!", size.x / 2, 100);
  levelUpgrades.forEach((e, i) => {
    button(e.name, 120 + i * 65, i, 1, () => {
      e.f();
      upgrades[e.i].times++;
      levelUp = false;
      levelUpgrades = [];
    }, e.description);
  });
  if (levelUpgrades.length == 0) {
    button("Next", 120, 0, 1, () => {
      levelUp = false;
      player.score += 2000;
      levelUpgrades = [];
    }, "Adds 2000 xp");
  }
}

function drawPauseMenu() {
  button("Resume", 120, 0, 0, () => {
    pause = false;
  });
  let controlLayouts = ["AD Turning", "Mouse + WASD"];
  button(controlLayouts[prefers.controls], 210, 1, 0, () => {
    prefers.controls++;
    if (prefers.controls > controlLayouts.length - 1) {
      prefers.controls -= controlLayouts.length;
    }
  });
  
  button("Quit", 500, 2, 0, () => {
    player.hp = 0;
    pause = false;
  });

  button(prefers.showArrows ? "On" : "Off", 300, 3, 0, () => {
    prefers.showArrows = !prefers.showArrows;
  });

  button(prefers.doScreenshake ? "On" : "Off", 390, 4, 0, () => {
    prefers.doScreenshake = !prefers.doScreenshake;
  });

  textSize(40);
  textAlign(CENTER);
  textStyle(NORMAL);
  textFont("monospace");
  fill(255);
  stroke(255);
  strokeWeight(1);
  text("Paused", size.x / 2, 100);

  textSize(25);
  text("Control Layout:", size.x / 2, 200);
  text("Pickup Guides:", size.x / 2, 290);
  text("Screenshake: ", size.x / 2, 380);
}

function drawDeathScreen() {
  fill(255);
  stroke(0);
  strokeWeight(5);
  textAlign(CENTER);
  textStyle(BOLD);
  textFont("monospace");
  textSize(70);
  text("You Died", size.x / 2, size.y / 2 - 30);
  textSize(30);
  if (player.score >= parseInt(localStorage.getItem("highscore"))) {
    text("New highscore! " + player.score.toLocaleString(), size.x / 2, size.y / 2 + 20);
    text("Press space to restart", size.x / 2, size.y / 2 + 60);
  } else {
    text("Your score: " + player.score.toLocaleString(), size.x / 2, size.y / 2 + 20);
    text("Highscore: " + parseInt(localStorage.getItem("highscore")).toLocaleString(), size.x / 2, size.y / 2 + 60);
    text("Press space to restart", size.x / 2, size.y / 2 + 100);
  }
  if (keyIsDown(32) && !player.restart) {
    setup();
  }
}

function drawHUD() {
  for (let i = 0; i < player.maxHp; i++) {
    fill(player.hp >= (i + 1) ? 255 : 0);
    stroke(255);
    strokeWeight(3);
    push();
    translate(30 + i * 35, 25);
    beginShape();
    vertex(0, 15);
    vertex(-13, 2);
    vertex(-7, -4);
    vertex(0, 2);
    vertex(7, -4);
    vertex(13, 2);
    vertex(0, 15);
    endShape();
    pop();
  }

  fill(0);
  stroke(255);
  strokeWeight(2);
  rect(20, 54, 160, 10);
  fill(255);
  rect(20, 54, 160 * player.xp / player.lvlUp, 10);

  fill(255);
  stroke(255);
  strokeWeight(1);
  textSize(20);
  textAlign(LEFT);
  textFont("monospace");
  textStyle(NORMAL);
  text("Level " + (player.lvl + 1), 20, 90);
  text(player.score.toLocaleString(), 20, 110);

  textSize(40);
  textAlign(CENTER);
  let sec = floor(timer % 60).toString();
  text(`${floor(timer / 60)}:${sec.length == 1 ? "0" + sec : sec}`, size.x / 2, 40);

  fill("rgba(0, 0, 0, 0.5)");
  stroke(250);
  strokeWeight(3);
  rect(size.x - 160, size.y - 160, 150, 150);
  push();
  translate(size.x - 85, size.y - 85);
  scale(150 / world.size.x);

  strokeWeight(10);
  fill("rgba(0, 0, 0, 0.5)");
  for (let x = -world.size.x; x <= world.size.x; x += world.size.x) {
    for (let y = -world.size.y; y <= world.size.y; y += world.size.y) {
      let x1 = player.pos.x - size.x / 2 + x;
      if (x1 > world.size.x / 2) x1 = world.size.x / 2;
      if (x1 < -world.size.x / 2) x1 = -world.size.x / 2;
      let y1 = player.pos.y - size.y / 2 + y;
      if (y1 > world.size.y / 2) y1 = world.size.y / 2;
      if (y1 < -world.size.y / 2) y1 = -world.size.y / 2;
      let x2 = player.pos.x + size.x / 2 + x;
      if (x2 > world.size.x / 2) x2 = world.size.x / 2;
      if (x2 < -world.size.x / 2) x2 = -world.size.x / 2;
      let y2 = player.pos.y + size.y / 2 + y;
      if (y2 > world.size.y / 2) y2 = world.size.y / 2;
      if (y2 < -world.size.y / 2) y2 = -world.size.y / 2;
      rect(x1, y1, x2 - x1, y2 - y1);
    }
  }

  strokeWeight(5);
  fill(255);
  asteroids.forEach((e) => {
    ellipse(e.pos.x, e.pos.y, e.size, e.size);
  });
  world.pickups.forEach((e) => {
    fill(pickupData[e.type].col);
    circle(e.pos.x, e.pos.y, 40);
  });
  push();
  translate(player.pos);
  rotate(player.dir);
  fill(255);
  triangle(-20, -25, -20, 25, 35, 0);
  pop();
  pop();
}

function drawPointerArrows() {
  if (prefers.showArrows) {
    world.pickups.forEach((e) => {
      let pos = p5.Vector.add(e.pos, e.closest);
      let dif = p5.Vector.sub(player.pos, pos);
      let render = false;
      let s = p5.Vector.sub(size, v(20, 20));
      if (dif.x <= -s.x / 2) {
        render = true;
        dif.div(dif.x / (-s.x / 2));
      }
      if (dif.y <= -s.y / 2) {
        render = true;
        dif.div(dif.y / (-s.y / 2));
      }
      if (dif.x >= s.x / 2) {
        render = true;
        dif.div(dif.x / (s.x / 2));
      }
      if (dif.y >= s.y / 2) {
        render = true;
        dif.div(dif.y / (s.y / 2));
      }
      if (render) {
        push();
        translate(p5.Vector.mult(dif, -1));
        rotate(dif.heading());
        fill(pickupData[e.type].col);
        noStroke();
        triangle(10, -10, 10, 10, -15, 0);
        pop();
      }
    });
  }
}

function v(x, y) {
  return createVector(x, y);
}
function astSplit(pos, dir, size, vel, dst) {
  explosions.push({ pos: pos.copy(), vel: vel.copy(), tick: 0, size: size / 3 });
  world.screenshake.set(size * screenshakeModifier, size * screenshakeModifier, 0.1)
  player.score += size > 35 ? 150 : (size > 25 ? 100 : 75);
  player.xp += size > 35 ? 2 : 1;
  if (size > 35 && random() > 0.5) {
    asteroidSpawnTimer = 0;
  }
  if (random() < (size / 100 - 0.2) * 70 / (timer + 200) + 0.005) {
    let choices = [];
    pickupData.forEach((option, i) => {
      for (let n = 0; n < option.weight * 20; n++) choices.push(i);
    });
    world.pickups.push({ type: floor(random() * pickupData.length), pos: pos });
  }
  if (size >= 25) {
    let num = 3;//+Math.round(random());
    for (let i = -1; i <= 1; i += 2 / (num - 1)) {
      asteroids.push({
        pos: pos.copy(),
        vel: p5.Vector.add(vel, v(3, 0).rotate(dir + i)),
        size: size / 4 * 3,
        hp: 1 + floor(timer / 300) * 0.5
      });
      asteroids[asteroids.length - 1].pos.add(
        p5.Vector.mult(p5.Vector.sub(asteroids[asteroids.length - 1].vel, vel), dst / 6)
      );
    }
  }
}
function button(txt, yPos, i, style, func, desc) {
  textSize(30);
  textAlign(CENTER);
  textStyle(NORMAL);
  textFont("monospace");
  let w, h;
  if (style == 0) {
    w = textWidth(txt) + 15;
    h = 40;
  } else if (style == 1) {
    w = 300;
    h = 60;
  }
  let hover = (mouseX > size.x / 2 - w / 2 && mouseY > yPos && mouseX < size.x / 2 + w / 2 && mouseY < yPos + h);
  pauseBtns.push(hover && mouseIsPressed);
  if (style == 0) {
    fill(hover ? 130 : 110);
    rect(size.x / 2 - w / 2, yPos, w, h, 10);
    fill(255);
    text(txt, size.x / 2, yPos + 30);
  } else if (style == 1) {
    fill(hover ? 90 : 70);
    rect(size.x / 2 - w / 2, yPos, w, h, 5);
    fill(255);
    text(txt, size.x / 2, yPos + 30);
    textSize(15);
    text(desc, size.x / 2, yPos + 50);
  }
  if (hover && mouseIsPressed && !oldBtns[i]) {
    func();
  }
}
window.onblur = () => {
  if (!levelUp) pause = true;
}
