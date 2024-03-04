document.getElementById("levelUpDialog").addEventListener("cancel", (e) => e.preventDefault());
document.getElementById("deathDialog").addEventListener("cancel", (e) => e.preventDefault());

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
  prefers = { controls: 1, showArrows: true, doScreenshake: true, minimap: true },
  timer,
  levelUp,
  levelUpgrades,
  player,
  clampTime,
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
  },
  username;

const screenshakeModifier = 0.225,
  defaultUsername = "Spaceman"

if (!localStorage.getItem("highscore")) {
  localStorage.setItem("highscore", 0);
}

if (typeof JSON.parse(localStorage.getItem("highscore")) != "object") {
  const highscoreNumber = parseInt(localStorage.getItem("highscore"))
  localStorage.setItem("highscore", JSON.stringify({
    kills: 0,
    pickups: 0,
    other: highscoreNumber
  }))
}

if (!localStorage.getItem("username")) {
  username = prompt("Enter a username", defaultUsername) || defaultUsername;
  localStorage.setItem("username", username)
} else {
  username = localStorage.getItem("username") || defaultUsername;
}

function changeUsername() {
  username = prompt("Change your username", username) || defaultUsername;
  localStorage.setItem("username", username)
}

const upgrades = [
  { name: "Speed", f: () => player.speed += 0.2, weight: 1, description: "Your ship moves faster", max: 5 },
  { name: "Multishot", f: () => player.multishot += 1, weight: 0.2, description: "Shoot more bullets", max: 10 },
  { name: "Fire rate", f: () => player.reloadTime *= 0.85, weight: 0.8, description: "Shoot faster", max: 10 },
  { name: "Health", f: () => { player.maxHp++; player.hp += 2; }, weight: 0.9, description: "Increases your max health by 1", max: 5 },
  { name: "Projectile Speed", f: () => player.projectileSpeed += 2, weight: 1, description: "Your bullets move faster", max: 10 },
  { name: "Damage", f: () => player.dmg += 0.3, weight: 0.6, description: "Your bullets do more damage", max: 10 },
  { name: "Homing", f: () => { player.homing += 0.3; player.homingRange += 20 }, weight: 0.15, description: "Your bullets home on targets", max: 5 },
  // { name: "Projectile Size", f: () => player.projectileSize += 3, weight: 0.9, description: "Your bullets are larger", max: 5}
];
const pickupData = [
  {
    col: "rgb(220, 50, 0)",
    weight: 1,
    collect: () => { player.hp++; player.score.pickups += 350; },
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
    collect: () => { player.shield = true; player.score.pickups += 350; },
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
    collect: () => { player.score.pickups += 1000; player.xp += Math.max(75, Math.floor(player.lvlUp / 10)) },
    draw: () => {
      fill("rgb(230, 200, 50)");
      stroke("rgb(200, 180, 40)");
      strokeWeight(5);
      circle(0, 0, 25);
      stroke("rgb(210, 190, 40)");
      line(0, -5, 0, 5);
    }
  }, {
    col: "rgb(190, 170, 40)",
    weight: 0,
    collect: () => {
      player.score.other += 10000
      let gotten = [];
      for (let i = 0; i < 2; i++) {
        let r = floor(random() * upgrades.length);
        upgrades[r].f();
        upgrades[r].times++;
        gotten.push(r);
      }
      document.getElementById("chestItems").showModal();
      document.getElementById("upgradesGot").innerHTML = gotten.map(e => `<h2>${upgrades[e].name} ${upgrades[e].times}</h2>`).join("");
      pause = true;
      document.getElementById("continue").addEventListener("click", () => {
        pause = false;
        document.getElementById("chestItems").close();
      });
    },
    draw: () => {
      stroke("rgb(200, 180, 40)");
      fill("rgb(130, 110, 50)");
      strokeWeight(5);
      ellipse(0, -5, 50, 30);
      rect(-25, -5, 50, 20);
      noStroke();
      fill(120);
      ellipse(0, -3, 5, 10);
    }
  }
];

const bosses = [
  {
    time: 60,
    data: {
      pos: 500,  // distance from player
      vel: 0,    // speed in random direction
      size: 40,
      hp: 50,
      followPlayer: 0.02,
      chestItems: 2
    }
  }, {
    time: 120,
    data: {
      pos: 500,  // distance from player
      vel: 0,    // speed in random direction
      size: 50,
      hp: 175,
      followPlayer: 0.05,
      chestItems: 2
    }
  }, {
    time: 180,
    data: {
      pos: 500,  // distance from player
      vel: 0,    // speed in random direction
      size: 80,
      hp: 375,
      followPlayer: 0.1,
      chestItems: 3
    }
  }, {
    time: 300,
    data: {
      pos: 500,  // distance from player
      vel: 0,    // speed in random direction
      size: 100,
      hp: 600,
      followPlayer: 0.3,
      chestItems: 4
    }
  }, /* {
    time: 420,
    data: {
      pos: 1500,  // distance from player
      vel: 0,    // speed in random direction
      size: 320,
      hp: 1024,
      followPlayer: 0.5
    }
  } */
];

function setup() {
  upgrades.forEach((e) => {
    e.times = 0;
  });

  pause = false;
  bossFight = false;
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
  asteroidSpeed = 1.5;
  timer = 0;
  world.size = v(3000, 3000);
  size = v(innerWidth, innerHeight);
  if (size.x > world.size.x - 10) size.x = world.size.x - 10;
  if (size.y > world.size.y - 10) size.y = world.size.y - 10;

  createCanvas(size.x, size.y);

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
    score: {
      kills: 0,
      pickups: 0,
      other: 0
    },
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
    dmg: 1,
    homing: 0,
    homingRange: 80
  };
  frameRate(1000);

  // testing, all pickups
  // for (let j = 0; 10 > j++;) {
  //   for (let i = 0; i < pickupData.length; i++) {
  //     world.pickups.push({ pos: v(i * 100 - pickupData.length * 50 + 50, -1000 + j * 50), type: i })
  //   }
  // }
}

function draw() {
  clampTime = Math.min(deltaTime, 100);

  if (!pause && !levelUp) {
    if (bossFight) {
      if (asteroids.filter(e => e.boss && e.original).length == 0) {
        bossFight = false;
      }
    }
    else {
      if (asteroidSpawnTimer <= 0 && player.alive) {
        asteroidSpawnTimer = asteroidSpawnRate;
        asteroidSpawnRate *= 0.925;
        if (asteroidSpawnRate < 20) asteroidSpawnRate = 20;
        asteroidSpeed += 0.005;
        asteroids.push({
          pos: p5.Vector.add(player.pos, v(size.x / 2, 0).rotate(random() * 2 * PI - PI)),
          vel: v(random() * asteroidSpeed + asteroidSpeed, 0).rotate(random() * 2 * PI - PI),
          size: 40, hp: 2 + floor(timer / 300),
          original: true
        });
      } else {
        asteroidSpawnTimer -= 0.03 * clampTime;
      }
      if (player.alive) {
        bosses.forEach((e) => {
          if (timer >= e.time && timer <= e.time + 1) {
            asteroids.push(e.data);
            bossFight = true;
            boss = asteroids[asteroids.length - 1];
            boss.original = true;
            boss.boss = true;
            for (let key in boss) {
              let prop = boss[key];
              if (key == "pos" && typeof prop == "number") {
                boss.pos = p5.Vector.add(player.pos, v(boss.pos, 0).rotate(random() * 2 * PI));
              }
              if (key == "vel" && typeof prop == "number") {
                boss.vel = v(boss.vel, 0).rotate(random() * 2 * PI);
              }
            }
          }
        });
      }
    }
    player.pos.add(p5.Vector.mult(player.vel, clampTime * 0.03));
    player.vel.mult(0.95);
    if (player.alive) {
      timer += clampTime * 0.001;

      let joy = v(keyIsDown(68) - keyIsDown(65), keyIsDown(83) - keyIsDown(87)).normalize();
      if (prefers.controls == 0) {
        let dst = v(joy.y, 0).rotate(player.dir).mult(-player.speed);
        player.vel.add(dst);
        player.dirVel += joy.x * 0.03;
        player.dir += player.dirVel * clampTime * 0.03;
        player.dirVel *= 0.9;
      } else if (prefers.controls == 1) {
        player.vel.add(p5.Vector.mult(joy, player.speed + 0.1));
        player.dir = p5.Vector.sub(v(mouseX, mouseY), p5.Vector.div(size, 2)).heading();
      }
      player.iframe -= clampTime * 0.03;
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
        player.score.other += 1000;
        player.hp += 1;
        levelUp = true;
      }
      if (levelUp && levelUpgrades.length == 0) {
        startLevelUp();
      }
      if ((keyIsDown(32) || mouseIsPressed) && player.reload <= 0) {
        let num = round(player.multishot);
        for (let i = 0; i < num; i++) {
          bullets.push({
            pos: player.pos.copy(),
            vel: p5.Vector.add(player.vel, v(player.projectileSpeed, 0).rotate(player.dir + i * player.spread - player.spread * (num - 1) / 2)),
            dst: v(0, 0),
            playerVel: player.vel.copy(),
            dmg: player.dmg * (0.7 / (1 + abs(i - (num - 1) / 2)) + 0.3)
          });
          bullets[bullets.length - 1].pos.add(p5.Vector.mult(p5.Vector.sub(bullets[bullets.length - 1].vel, player.vel), 1.5));
        }
        player.reload = player.reloadTime;
      } else {
        player.reload -= clampTime * 0.03;
      }
      if (player.hp <= 0) {

        player.alive = false;
        world.screenshake.set(8, 8, 1)
        explosions.push({ pos: player.pos.copy(), vel: player.vel.copy(), size: 20, tick: 0 });
        bullets = [];

        showDeathScreen();

        //https://stackoverflow.com/questions/16449295/how-to-sum-the-values-of-a-javascript-object
        if (Object.values(player.score).reduce((a, b) => a + b, 0) >= Object.values(JSON.parse((localStorage.getItem("highscore")))).reduce((a, b) => a + b, 0)) localStorage.setItem("highscore", JSON.stringify(player.score));
      }
    }

    asteroids.forEach((e, i) => {
      if (!Object.hasOwn(e, "boss")) e.boss = false;
      if (!Object.hasOwn(e, "closest")) e.closest = v(0, 0);
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
            astSplit(e, dst.heading() + PI);
            asteroids.splice(i, 1);
            i--;
          }
        } else if (e.followPlayer > 0) {
          dst.add(e.closest);
          dst.normalize();
          dst.mult(e.followPlayer);
          e.vel.sub(dst);
        }
      }
    });
    tickBullets();
    explosions.forEach((e, i) => {
      e.tick += clampTime * 0.03;
      if (e.tick >= 2 + e.size / 3) {
        explosions.splice(i, 1);
      }
    });
  }
  if (keyIsDown(27) && !pauseKey) {
    pause = !pause;
    if (pause) pauseGame();
  }
  if (levelUp) {
    pause = false;
    document.getElementById("pauseMenu").close();
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

  world.screenshake.timeRemaining -= clampTime / 1000
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
      fill(0);
      asteroids.forEach((a) => {
        push();
        if (a.boss) {
          stroke("rgb(255,150,150)");
          fill("rgb(50,0,0)");
        } else {
          stroke(255);
          fill(0);
        }
        ellipse(a.pos.x, a.pos.y, a.size, a.size);
        pop();
        if (p5.Vector.sub(p5.Vector.add(a.pos, v(xOff, yOff)), player.pos).mag() < p5.Vector.sub(p5.Vector.add(a.pos, a.closest), player.pos).mag()) {
          a.closest = v(xOff, yOff);
        }
      });
      bullets.forEach((b) => {
        strokeWeight(player.projectileSize);
        line(b.pos.x, b.pos.y, b.pos.x - (b.vel.x - b.playerVel.x), b.pos.y - (b.vel.y - b.playerVel.y));
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
        if (p5.Vector.sub(pos, player.pos).mag() < p5.Vector.sub(p5.Vector.add(pickup.pos, pickup.closest), player.pos).mag()) {
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
  } else {
    if (keyIsDown(32) && !player.restart) {
      setup();
      document.getElementById("deathDialog").close()
    }
  }
  pop();
  if (player.alive) {
    drawHUD();
  }

  if (pause) {
    drawPauseMenu();
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

addEventListener("resize", () => {
  size.set(innerWidth, innerHeight);
  if (size.x > world.size.x - 10) size.x = world.size.x - 10;
  if (size.y > world.size.y - 10) size.y = world.size.y - 10;
  resizeCanvas(size.x, size.y, true);
});

function tickBullets() {
  bullets.forEach((bullet, i) => {
    bullet.pos.add(p5.Vector.mult(bullet.vel, clampTime * 0.03));
    bullet.dst.add(p5.Vector.mult(p5.Vector.sub(bullet.vel, player.vel), clampTime * 0.03));
    let s = -bullet.vel.mag();
    if (bullet.dst.x > world.size.x / 2 + s || bullet.dst.y > world.size.y / 2 + s || bullet.dst.x < -world.size.x / 2 - s || bullet.dst.y < -world.size.y / 2 - s) {
      bullets.splice(i, 1);
    } else {
      bullet.pos.x = (bullet.pos.x + world.size.x / 2) % world.size.x - world.size.x / 2;
      bullet.pos.y = (bullet.pos.y + world.size.y / 2) % world.size.y - world.size.y / 2;
      let run = true;
      for (let offX = -world.size.x; offX <= world.size.x; offX += world.size.x) {
        for (let offY = -world.size.y; offY <= world.size.y; offY += world.size.y) {
          asteroids.filter(asteroid => p5.Vector.sub(p5.Vector.add(bullet.pos, v(offX, offY)), asteroid.pos).mag() + asteroid.size / 2 < Math.max(player.homingRange, player.projectileSize * 1.2)).forEach((asteroid, ti) => {
            if (run) {
              let baseDst = p5.Vector.sub(bullet.pos, asteroid.pos);
              let dst = p5.Vector.add(baseDst, v(offX, offY));
              if (dst.mag() < asteroid.size / 2 + 10 + player.projectileSize * 1.2) {
                bullets.splice(i,1);
                run = false;
                i--;
                asteroid.hp -= bullet.dmg;
                if (asteroid.hp <= 0) {
                  astSplit(asteroid, bullet.vel.heading());
                  asteroids.splice(asteroids.indexOf(asteroid), 1);
                  ti--;
                }
              } else if (dst.mag() + asteroid.size / 2 < player.homingRange && player.homing > 0) {
                let mag = dst.mag() + asteroid.size / 2;
                dst.normalize();
                dst.mult(player.homing / (mag + 200) * 100 + player.homing * 0.5);
                mag = bullet.vel.mag();
                bullet.vel.normalize();
                bullet.vel.mult(mag - dst.mag());
                bullet.vel.sub(dst);
                bullet.vel.normalize();
                bullet.vel.mult(mag);
              }
            }
          });
        }
      }
    }
  });
}

function drawPauseMenu() {
  document.getElementById("control").innerHTML = ["AD Turning", "Mouse + WASD"][prefers.controls];
}
function pauseGame() {
  pause = true;
  document.getElementById("pauseMenu").showModal();
  document.getElementById("resume").addEventListener("click", () => { pause = false; document.getElementById("pauseMenu").close() });
  document.getElementById("quit").addEventListener("click", () => { player.hp = 0; pause = false; document.getElementById("pauseMenu").close() });
  document.getElementById("control").addEventListener("click", () => { prefers.controls++; if (prefers.controls > 1) prefers.controls -= 2 });
  [...document.getElementById("pauseMenu").querySelectorAll("label")].forEach(label => {
    const checkbox = label.querySelector("input[type='checkbox']")
    checkbox.checked = prefers[checkbox.id];
  })
}

[...document.getElementById("pauseMenu").querySelectorAll("label")].forEach(label => {
  const checkbox = label.querySelector("input[type='checkbox']")
  checkbox.addEventListener("input", (e) => {
    prefers[e.target.id] = e.target.checked
  })
})

function startLevelUp() {
  try {
    let choices = [];
    upgrades.forEach((e, i) => {
      if (e.times < e.max) {
        for (let n = 0; n < e.weight; n += 0.05) {
          choices.push({ name: e.name, f: e.f, description: e.description, i: i });
        }
      }
    });
    levelUpgrades = [];
    if (choices.length > 0) {
      for (let n = 0; n < 3; n++) {
        let r = floor(random() * choices.length);
        levelUpgrades.push(choices[r]);
        choices = choices.filter(e => e.i != choices[r].i);
      }
    } else {
      levelUpgrades.push({ name: "Next", f: () => player.score.other += 2000, description: "Adds 2000 xp", i: -1 });
    }
    document.getElementById("levelUpDialog").showModal();
    try {
      document.getElementById("choices").innerHTML = levelUpgrades.map((upgrade, i) => `<button id="levelUp${i}"><h2>${upgrade.name}</h2><p>${upgrade.description}</p><p>${upgrades[upgrade.i].times}/${upgrades[upgrade.i].max}</p></button>`).join("<br/>");
    } catch (e) { }
    levelUpgrades.forEach((e, i) => {
      document.getElementById("levelUp" + i).addEventListener("click", () => {
        e.f();
        levelUp = false;
        document.getElementById("levelUpDialog").close();
        upgrades[e.i].times++;
        levelUpgrades = [];
      });
    });
  } catch (error) {
    console.error(error)
  }

}

async function showDeathScreen() {
  const fullPlayerScore = Object.values(player.score).reduce((a, b) => a + b, 0);
  const fullHighscore = Object.values(JSON.parse(localStorage.getItem("highscore"))).reduce((a, b) => a + b, 0)
  const deathScreen = document.getElementById("deathDialog")


  await submitScore(username, timer, player.score)
  const globalHighscores = await getScores();
  let i = 0
  globalHighscores.forEach(score => {
    i++;
    const data = score.data()
    const time = Math.floor(data.time)
    const minutes = Math.floor(time / 60)
    const seconds = time - minutes * 60
    document.getElementById("leaderboard").innerHTML += `${i}. <b>${data.username}</b>: ${data.total.toLocaleString()} - ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}<br>`
  })


  console.log(globalHighscores)

  deathScreen.showModal();
  if (fullPlayerScore >= fullHighscore) {
    deathScreen.querySelector("span").innerHTML = `
      New Highscore! ${fullPlayerScore.toLocaleString()}<br>
    `
  } else {
    deathScreen.querySelector("span").innerHTML = `
      Your score: ${fullPlayerScore.toLocaleString()}<br>
      Your Highscore: ${fullHighscore.toLocaleString()}<br>
    `
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
  text(Object.values(player.score).reduce((a, b) => a + b, 0).toLocaleString(), 20, 110);

  textSize(40);
  textAlign(CENTER);
  let sec = floor(timer % 60).toString();
  text(`${floor(timer / 60)}:${sec.length == 1 ? "0" + sec : sec}`, size.x / 2, 40);

  if (prefers.minimap) {
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
      if (e.boss) {
        fill("rgb(255,150,150)");
      } else {
        fill(255);
      }
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
}

function drawPointerArrows() {
  if (prefers.showArrows) {
    world.pickups.forEach((e, i) => {
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
function astSplit(a, dir) {
  explosions.push({ pos: a.pos.copy(), vel: a.vel.copy(), tick: 0, size: a.size / 3 });
  world.screenshake.set(a.size * screenshakeModifier, a.size * screenshakeModifier, 0.1)
  player.score.kills += a.size > 35 ? 150 : (a.size > 25 ? 100 : 75);
  player.xp += a.size > 35 ? 2 : 1;
  if (a.boss && a.original) {
    world.pickups.push({ type: 3, pos: a.pos });
  }
  if (a.size > 35 && random() < 0.5) {
    asteroidSpawnTimer = 0;
  }
  if (random() < (a.size / 100 - 0.2) * 70 / (timer + 200) + 0.005) {
    let choices = [];
    pickupData.forEach((option, i) => {
      for (let n = 0; n < option.weight * 20; n++) choices.push(i);
    });
    world.pickups.push({ type: choices[floor(random() * choices.length)], pos: a.pos });
  }
  if (a.size >= 25) {
    let num = a.boss ? 5 : 3;
    for (let i = -1; i <= 1; i += 2 / (num - 1)) {
      asteroids.push({
        pos: a.pos.copy(),
        vel: p5.Vector.add(a.vel, v(3, 0).rotate(dir + i)),
        size: a.size * (a.boss ? (3 / 5) : (3 / 4)),
        hp: round(a.size / (a.boss ? 20 : 25)) + floor(timer / 300) * 0.5,
        boss: a.boss,
        followPlayer: a.followPlayer / 4 * 3,
        original: false
      });
      asteroids[asteroids.length - 1].pos.add(
        p5.Vector.mult(p5.Vector.sub(asteroids[asteroids.length - 1].vel, a.vel), a.size / 6)
      );
    }
  }
}

window.onblur = () => {
  if (!levelUp) pauseGame();
}
