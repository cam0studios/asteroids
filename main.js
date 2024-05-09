const version = "3.10.0";
const pageTime = new Date();

document.getElementById("levelUpDialog").addEventListener("cancel", (e) => e.preventDefault());
document.getElementById("deathDialog").addEventListener("cancel", (e) => e.preventDefault());
document.getElementById("startMenu").addEventListener("cancel", (e) => e.preventDefault());
const resolution = document.getElementById("resolution");

const screenshakeModifier = 0.225,
  defaultUsername = "Spaceman",
  worldSize = 3000

var asteroids,
  explosions,
  asteroidSpawnTimer,
  asteroidSpawnRate,
  asteroidSpeed,
  size,
  pause,
  pauseBtns,
  oldBtns,
  prefers = { controls: 1, showArrows: true, doScreenshake: true, minimap: true, showTouchControls: false, touchControlHeight: 150, toggleFire: false },
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
        world.screenshake.intensityX = x;
        world.screenshake.intensityY = y;
        world.screenshake.timeRemaining = time;
      }
    }
  },
  username = localStorage.getItem("username"),
  maxFight,
  tick,
  bossFight,
  movementTouch,
  dirTouch,
  mouseDown,
  projectiles = [],
  rarityData = {
    "-1": "rgb(70, 70, 70)",
    0: "rgb(70, 70, 70)",
    1: "rgb(71, 116, 65)",
    2: "rgb(65, 78, 116)",
    3: "rgb(95, 65, 116)",
    4: "rgb(131, 104, 22)",
    5: "rgb(150, 46, 46)"
  }

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

function isUsernameValid(username) {
  return username.trim().length <= 20 && username.trim().length !== 0
}

function setUsername(wasInvalid) {
  return new Promise((res, rej) => {
    vex.dialog.prompt({
      message: wasInvalid ? "Your username must be between 1 and 20 characters long, please pick a new one." : "You'll need a username to be added to the leaderboard.",
      placeholder: 'Spaceman',
      callback: function (value) {
        if (value === undefined) value = ""
        if (isUsernameValid(value)) {
          value = value.trim()
          username = value
          localStorage.setItem("username", value)
          setUser({}, { username })
          res(username)
        } else {
          rej(value)
        }
      }
    })
  })
}

function changeUsername() {
  document.getElementById("pauseMenu").close()
  pause = true
  vex.dialog.prompt({
    message: 'Enter a new username',
    placeholder: localStorage.getItem("username") || 'Spaceman',
    callback: function (value) {
      if (!value) value = ""
      if (isUsernameValid(value)) {
        value = value.trim()
        username = value
        localStorage.setItem("username", value)
        setUser({}, { username })
        pause = false
      } else {
        alert("Your username is invalid. Usernames must be 20 characters or less.")
        pause = false
      }
    }
  })
}

const upgrades = [
  { name: "Speed", f: () => player.speed += 0.2, weight: 1, description: "Your ship moves faster", max: 5, rarity: 0 },
  { name: "Health", f: () => { player.maxHp++; player.hp += 2; }, weight: 0.9, description: "+1 Max Heath, Heal 2 Hearts", max: 5, rarity: 0 },
  { name: "Shield Upgrade", f: () => { player.shieldLvl++; player.shield++; player.shieldRegenTime -= 20 }, weight: 0.2, description: "+1 Shield Limit", max: 3, rarity: 3 },
  // { name: "Guardian", f: () => { player.weapons.guardianLvl++ }, weight: 0.3, description: "Adds a spinning blade", max: 5 },
  // { name: "Projectile Size", f: () => player.projectileSize += 3, weight: 0.9, description: "Your bullets are larger", max: 5}
];
const weapons = [
  {
    name: "Gun",
    id: "gun",
    description: "Starter weapon",
    weight: 0,
    rarity: 0,
    starter: true,
    onGet: () => {
      let weaponObject = {}
      weaponObject = Object.assign(weapons.find(x => x.id == "gun"), weaponObject);

      weaponObject.upgrades.forEach(upgrade => upgrade.times = 0)
      weaponObject.damage = 1;
      weaponObject.projectileSpeed = 15;
      weaponObject.cooldown = 0;
      weaponObject.lvl = 0;
      weaponObject.amount = 1;
      weaponObject.fireRate = 0.15;
      weaponObject.spread = 0.1;
      weaponObject.homing = 0;
      weaponObject.homingRange = 80;
      player.weapons.push(weaponObject);
    },
    upgrades: [
      {
        name: "Multishot",
        onGet: (weapon) => weapon.amount++,
        weight: 0.1,
        desc: "+1 Bullet per shot",
        max: 5,
        rarity: 4
      }, {
        name: "Fire rate",
        onGet: (weapon) => weapon.fireRate *= 0.85,
        weight: 0.8,
        desc: "Shoot faster",
        max: 10,
        rarity: 1
      }, {
        name: "Projectile Speed",
        onGet: (weapon) => weapon.projectileSpeed += 4,
        weight: 1,
        desc: "Your bullets move faster",
        max: 5,
        rarity: 0
      }, {
        name: "Damage",
        onGet: (weapon) => weapon.damage += 0.3,
        weight: 0.6,
        desc: "+0.3 Bullet damage",
        max: 10,
        rarity: 2
      }, {
        name: "Homing",
        onGet: (weapon) => { weapon.homing += 0.3; weapon.homingRange += 20 },
        weight: 0.25,
        desc: "Bullets home toward targets",
        max: 5,
        rarity: 3
      },
    ],
    onUpgrade: (weapon) => {

    },
    tick: (weapon) => {
      if ((((keyIsDown(32) || mouseIsPressed) && !(prefers.showTouchControls && typeof movementTouch != "undefined" && typeof dirTouch != "undefined")) || prefers.autoFire) && weapon.cooldown <= 0) {
        let num = round(weapon.amount);
        for (let i = 0; i < num; i++) {
          player.stats.bulletsFired++;
          player.changedStats.bulletsFired++;
          projectiles.push({
            type: "gun",
            pos: player.pos.copy(),
            vel: p5.Vector.add(player.vel, v(weapon.projectileSpeed, 0).rotate(player.dir + i * weapon.spread - weapon.spread * (num - 1) / 2)),
            dst: v(0, 0),
            playerVel: player.vel.copy(),
            dmg: weapon.damage * (0.7 / (1 + abs(i - (num - 1) / 2)) + 0.3),
            homing: weapon.homing,
            homingRange: weapon.homingRange,
            lastPos: player.pos.copy()
          });
          let p = projectiles[projectiles.length - 1];
          p.pos.add(p.vel);
          p.pos.sub(player.vel);
        }
        weapon.cooldown = weapon.fireRate;
      } else {
        weapon.cooldown -= clampTime / 1000;
      }
    },
    projectileTick: (projectile, projectileI) => {
      projectile.lastPos = projectile.pos.copy();
      let move = p5.Vector.mult(projectile.vel, clampTime * 0.03);
      projectile.pos.add(move);
      projectile.dst.add(move);
      if (projectile.dst.x > world.size.x / 2 || projectile.dst.y > world.size.y / 2 || projectile.dst.x < -world.size.x / 2 || projectile.dst.y < -world.size.y / 2) {
        projectiles.splice(projectileI, 1);
        projectileI--;
      }
      let closestDst = world.size.mag();
      let closest = v(0, 0);
      let relPos = p5.Vector.sub(projectile.pos, player.pos);
      for (let x = -world.size.x; x <= world.size.x; x += world.size.x) {
        for (let y = -world.size.y; y <= world.size.y; y += world.size.y) {
          let dst = p5.Vector.add(relPos, v(x, y)).mag();
          if (dst < closestDst) {
            closestDst = dst;
            closest = v(x, y);
          }
        }
      }
      projectile.closest = closest;
    },
    drawTick: (projectile) => {
      push();
      translate(projectile.pos.x - player.pos.x + projectile.closest.x, projectile.pos.y - player.pos.y + projectile.closest.y);
      stroke(255);
      strokeWeight(5);
      line(0, 0, -projectile.vel.x + projectile.playerVel.x, -projectile.vel.y + projectile.playerVel.y);
      pop();
    },
    asteroidTick: (projectile, projectileI, asteroid, asteroidI) => {
      if (lineCircleCollision(projectile.pos, projectile.lastPos, p5.Vector.sub(p5.Vector.add(asteroid.pos, asteroid.closest), projectile.closest), asteroid.size / 2 + 10)) {
        projectiles.splice(projectileI, 1);
        projectileI--;
        asteroid.hp -= projectile.dmg;
        if (asteroid.hp <= 0) {
          asteroids.splice(asteroidI, 1);
          asteroidI--;
          astSplit(asteroid, projectile.vel.heading());
        }
      }

      let dst = p5.Vector.sub(projectile.pos, asteroid.pos);
      let mag = dst.mag() + asteroid.size / 2;
      if (mag < projectile.homingRange) {
        dst.normalize();
        dst.mult(projectile.homing / (mag + 200) * 100 + projectile.homing * 0.5);
        mag = projectile.vel.mag();
        projectile.vel.normalize();
        projectile.vel.mult(mag - dst.mag());
        projectile.vel.sub(dst);
        projectile.vel.normalize();
        projectile.vel.mult(mag);
      }
    }
  },
  {
    name: "Guardian",
    id: "guardian",
    description: "Spawns a spinning blade",
    weight: 0.1,
    rarity: 3,
    starter: false,
    onGet: () => {
      let weaponObject = {}
      weaponObject = Object.assign(weapons.find(x => x.id == "guardian"), weaponObject);

      weaponObject.upgrades.forEach(upgrade => upgrade.times = 0)
      weaponObject.power = 0.5;
      weaponObject.duration = 5;
      weaponObject.projectileSpeed = 1;
      weaponObject.cooldown = 0;
      weaponObject.lvl = 0;
      weaponObject.amount = 3;
      weaponObject.fireRate = 15;
      weaponObject.area = 1;
      player.weapons.push(weaponObject)
    },
    upgrades: [
      {
        name: "Extra Guardian",
        desc: "Adds an extra guardian",
        onGet: (weapon) => weapon.amount++,
        max: 2,
        weight: 0.2
      },
      {
        name: "Damage Up",
        desc: "Increases damage dealt on contact",
        onGet: (weapon) => weapon.power += 0.5,
        max: 3,
        weight: 0.3
      },
      {
        name: "Speed Up",
        desc: "Increases speed guardians spin",
        onGet: (weapon) => weapon.projectileSpeed += 2,
        max: 3,
        weight: 0.1
      },
      {
        name: "Area Up",
        desc: "Increases guardian size",
        onGet: (weapon) => weapon.area += 0.25,
        max: 4,
        weight: 0.3
      },
      {
        name: "Duration Up",
        desc: "Increases time guardians last",
        onGet: (weapon) => {
          weapon.duration += 1.25
          weapon.fireRate -= 1.25
        },
        max: 4,
        weight: 0.15
      }
    ],
    onUpgrade: (weapon) => {
      weapon.cooldown = 0;
    },
    tick: (weapon) => {
      if (weapon.cooldown <= 0) {
        weapon.cooldown = weapon.fireRate;
        for (let i = 0; i < 1; i += 1 / weapon.amount) {
          let r = i * 2 * PI;
          projectiles.push({ type: "guardian", rot: r, dst: 150 + weapon.lvl, speed: weapon.projectileSpeed, life: weapon.duration, rad: weapon.area * 20, time: 0, dmg: weapon.power, dir: v(1, 0) })
        }
      } else {
        weapon.cooldown -= clampTime / 1000
      }
    },
    projectileTick: (projectile, i) => {
      projectile.life -= clampTime / 1000;
      projectile.time += clampTime / 1000;
      projectile.rot += projectile.speed * clampTime / 1000
      projectile.dir = v(1, 0).rotate(projectile.rot + PI * 0.25);
      if (projectile.life <= 0) {
        projectiles.splice(i, 1)
      }
    },
    drawTick: (projectile) => {
      let pos = v(projectile.dst, 0).rotate(projectile.rot);
      stroke(255);
      strokeWeight(5);
      fill(0);
      let s = projectile.rad * 2;
      if (projectile.time < 1) {
        s *= projectile.time;
      }
      if (projectile.life < 1) {
        s *= projectile.life;
      }
      push();
      translate(pos.x, pos.y);
      rotate(projectile.rot * -3);
      scale(s);
      strokeWeight(0.7 / pow(s, 0.5));
      fill(0);
      ellipse(0, 0, 1, 1);
      fill(255);
      for (let r = 0; r < 1; r += 1 / (1 + projectile.dmg * 4)) {
        push();
        rotate(r * 2 * PI);
        triangle(0.5, 0.07, 0.5, -0.07, 0.6, 0);
        pop();
      }
      line(0.1, 0, -0.1, 0);
      line(0, 0.1, 0, -0.1);
      pop();
    },
    asteroidTick: (projectile, projectileIndex, asteroid, asteroidIndex) => {
      let pos = v(projectile.dst, 0).rotate(projectile.rot).add(player.pos);
      let lastPos = v(projectile.dst, 0).rotate(projectile.rot - projectile.speed * clampTime / 1000).add(player.pos);
      if (lineCircleCollision(pos, lastPos, p5.Vector.add(asteroid.pos, asteroid.closest), asteroid.size / 2 + projectile.rad + 5)) {
        asteroid.hp -= projectile.dmg;
        if (asteroid.hp <= 0) {
          astSplit(asteroid, projectile.dir?.heading() || 0);
          asteroids.splice(asteroidIndex, 1);
          asteroidIndex--;
        } else {
          let dir;
          dir = projectile.dir?.copy();
          dir.setMag(5);
          asteroid.vel.add(dir);
          dir.mult(2);
          asteroid.pos.add(dir);
        }
      }
    }
  },
  {
    name: "Bomb",
    id: "bomb",
    description: "Asteroid bosses only",
    weight: 0,
    starter: false,
    projectileTick: (projectile, i) => {
      projectile.time += clampTime / 1000;
      if (projectile.time >= 1) {
        projectiles.splice(i, 1);
        i--;
        explosions.push({ pos: projectile.pos, vel: v(0, 0), size: projectile.rad, tick: 0 });
        let dst = p5.Vector.sub(player.pos, projectile.pos);
        if (dst.mag() <= projectile.rad + 25 + (player.shield ? 1 : 0) * 10) {
          if (player.shield > 0) player.shield--;
          else player.hp--;
          player.iframe = 5;
          dst.normalize();
          dst.mult(20);
          player.vel.add(dst);
        }
      }

      let closestDst = world.size.mag();
      let closest = v(0, 0);
      let relPos = p5.Vector.sub(projectile.pos, player.pos);
      for (let x = -world.size.x; x <= world.size.x; x += world.size.x) {
        for (let y = -world.size.y; y <= world.size.y; y += world.size.y) {
          let dst = p5.Vector.add(relPos, v(x, y)).mag();
          if (dst < closestDst) {
            closestDst = dst;
            closest = v(x, y);
          }
        }
      }
      projectile.closest = closest;
    },
    drawTick: (projectile) => {
      push();
      translate(projectile.pos.x - player.pos.x + projectile.closest.x, projectile.pos.y - player.pos.y + projectile.closest.y);
      let a = abs(sin(projectile.time * 2.5 * PI));
      fill(`rgba(200,0,0,${0.2 * a})`);
      stroke(`rgba(200,0,0,${0.5 * a})`);
      strokeWeight(10);
      ellipse(0, 0, projectile.rad * 2, projectile.rad * 2);
      pop();
    },
    asteroidTick: () => { }
  },
  {
    name: "Missile",
    id: "missile",
    description: "Launches missiles at asteroids",
    weight: 100.1,
    rarity: 3,
    starter: false,
    onGet: () => {
      let weaponObject = {}
      weaponObject = Object.assign(weapons.find(x => x.id == "missile"), weaponObject);

      weaponObject.upgrades.forEach(upgrade => upgrade.times = 0)
      weaponObject.power = 3;
      weaponObject.duration = 5;
      weaponObject.projectileSpeed = 300;
      weaponObject.cooldown = 0;
      weaponObject.lvl = 0;
      weaponObject.amount = 5;
      weaponObject.fireRate = 15;
      weaponObject.area = 25;
      weaponObject.fireCooldown = 0;
      weaponObject.fired = -1;
      player.weapons.push(weaponObject)
    },
    onUpgrade: (weapon) => {
      weapon.cooldown = 0;
    },
    upgrades: [
      {
        name: "Count",
        desc: "Fire more missiles",
        onGet: (weapon) => { weapon.amount += 2 },
        max: 5,
        weight: 0.5
      }, {
        name: "Explosion",
        desc: "Missiles are bigger and do more damage",
        onGet: (weapon) => { weapon.power++; weapon.area += 15 },
        max: 5,
        weight: 0.3
      }, {
        name: "Fire rate",
        desc: "Fire more often",
        onGet: (weapon) => { weapon.fireRate -= 1.5 },
        max: 5,
        weight: 0.4
      }
    ],
    tick: (weapon) => {
      if (weapon.cooldown <= 0) {
        if (weapon.fired >= weapon.amount) {
          weapon.cooldown = weapon.fireRate;
          weapon.fired = -1;
        } else {
          if (weapon.fired == -1) {
            weapon.fired = 0;
            weapon.fireCooldown = 0;
          }
          if (weapon.fireCooldown <= 0) {
            weapon.fireCooldown = 0.02;
            let closest = asteroids.sort((a, b) => p5.Vector.sub(player.pos, p5.Vector.add(a.pos, a.closest)).mag() - p5.Vector.sub(player.pos, p5.Vector.add(b.pos, b.closest)).mag());
            if (closest.length > 0) {
              closest = closest[0];
              let dst = p5.Vector.sub(p5.Vector.add(closest.pos, closest.closest), player.pos);
              dst.add(p5.Vector.mult(closest.vel, dst / weapon.projectileSpeed));
              dst.setMag(weapon.projectileSpeed);
              projectiles.push({ type: "missile", pos: player.pos.copy(), vel: dst, life: weapon.duration, swerve: 0.5, swerveT: (random() - 0.5) * 1 * PI, swerveSpeed: 7, realVel: v(0, 0), dmg: weapon.power, area: weapon.area, closest: v(0, 0) });
              let proj = projectiles[projectiles.length - 1];
              proj.pos.add(p5.Vector.mult(p5.Vector.rotate(proj.vel, PI / 2), (random() - 0.5) * 0.5));
            }
            weapon.fired++;
          } else {
            weapon.fireCooldown -= clampTime / 1000;
          }
        }
      } else {
        weapon.cooldown -= clampTime / 1000;
      }
    },
    projectileTick: (projectile, i) => {
      let vel = projectile.vel.copy();
      vel.rotate(cos(projectile.swerveT) * projectile.swerve);
      projectile.realVel = vel;
      projectile.pos.add(p5.Vector.mult(vel, clampTime / 1000));
      projectile.life -= clampTime / 1000;
      if (projectile.life <= 0) {
        projectiles.splice(i, 1);
        i--;
      }
      projectile.swerveT += projectile.swerveSpeed * clampTime / 1000;
      let closestDst = world.size.mag();
      for (let x = -world.size.x; x <= world.size.x; x += world.size.x) {
        for (let y = -world.size.y; y <= world.size.y; y += world.size.y) {
          let dst = p5.Vector.sub(p5.Vector.add(projectile.pos, v(x, y)), player.pos).mag();
          if (dst < closestDst) {
            closestDst = dst;
            projectile.closest = v(x, y);
          }
        }
      }
    },
    drawTick: (projectile) => {
      push();
      translate(projectile.pos.x - player.pos.x + projectile.closest.x, projectile.pos.y - player.pos.y + projectile.closest.y);
      rotate(projectile.realVel.heading());
      fill(250);
      stroke(250);
      strokeWeight(1);
      rect(-15, -3, 20, 6);
      triangle(5, -3, 5, 3, 15, 0);
      triangle(-12, -7, -12, 7, -5, 0);
      pop();
    },
    asteroidTick: (projectile, projectileI, asteroid, asteroidI) => {
      if (p5.Vector.sub(p5.Vector.add(projectile.pos, projectile.closest), p5.Vector.add(asteroid.pos, asteroid.closest)).mag() < asteroid.size / 2 + projectile.area) {
        projectiles.splice(projectileI, 1);
        projectileI--;
        asteroid.hp -= projectile.dmg;
        explosions.push({ pos: p5.Vector.add(projectile.pos, projectile.closest), vel: v(0, 0), size: projectile.area, tick: 0 });
        if (asteroid.hp <= 0) {
          asteroids.splice(asteroidI, 1);
          asteroidI--;
          astSplit(asteroid, projectile.realVel.heading());
        }
      }
    }
  }
  /*{
    name: "Template",
    id: "template",
    description: "Template weapon",
    weight: 0.1,
    rarity: 3,
    starter: false,
    onGet: () => {
      let weaponObject = {}
      weaponObject = Object.assign(weapons.find(x => x.id == "template"), weaponObject);

      weaponObject.upgrades.forEach(upgrade => upgrade.times = 0)
      weaponObject.power = 5;
      weaponObject.duration = 5;
      weaponObject.projectileSpeed = 1;
      weaponObject.cooldown = 0;
      weaponObject.lvl = 0;
      weaponObject.amount = 1;
      weaponObject.fireRate = 2;
      weaponObject.area = 1;
      player.weapons.push(weaponObject)
    },
    onUpgrade: (weapon) => {
      weapon.cooldown = 0;
    },
    upgrades: [
      {
        name: "",
        desc: "",
        onGet: (weapon) => {},
        max: 5,
        weight: 0.5
      }
    ],
    tick: (weapon) => {
      if (weapon.cooldown <= 0) {
        weapon.cooldown = weapon.fireRate;
        projectiles.push({ type: "template" });
      } else {
        weapon.cooldown -= clampTime / 1000;
      }
    },
    projectileTick: (projectile, i) => {

    },
    drawTick: (projectile) => {
      push();
      translate(projectile.pos.x - player.pos.x, projectile.pos.y - player.pos.y);
      pop();
    },
    asteroidTick: (projectile, projectileI, asteroid, asteroidI) => {

    }
  },*/
  // {
  //   name: "Laser",
  //   id: "laser",
  //   description: "Creates a laser that can pierce asteroids",
  //   weight: 0.1,
  //   onGet: () => {
  //     let weaponObject = {}
  //     weaponObject = Object.assign(weapons.find(x => x.id == "laser"), weaponObject);

  //     weaponObject.upgrades.forEach(upgrade => upgrade.times = 0)
  //     weaponObject.power = 0.5;
  //     weaponObject.duration = 5;
  //     weaponObject.projectileSpeed = 0;
  //     weaponObject.cooldown = 0;
  //     weaponObject.lvl = 0;
  //     weaponObject.amount = 1;
  //     weaponObject.fireRate = 20;
  //     weaponObject.area = 1;
  //     player.weapons.push(weaponObject)
  //   },
  //   upgrades: [
  //     {
  //       name: "Damage Up",
  //       desc: "Increases damage per second",
  //       onGet: (weapon) => weapon.power += 0.5,
  //       max: 4
  //     },
  //     {
  //       name: "Size Up",
  //       desc: "Increases beam size",
  //       onGet: (weapon) => weapon.area += 1,
  //       max: 2
  //     },
  //     {
  //       name: "Duration up",
  //       desc: "Increases time beam lasts",
  //       onGet: (weapon) => weapon.duration += 2.5,
  //       max: 4
  //     }
  //   ],
  //   tick: (weapon) => {
  //     if (weapon.cooldown <= 0) {
  //       weapon.cooldown = weapon.fireRate;
  //       projectiles.push({ type: "laser", size: weapon.area, life: weapon.duration })
  //     } else {
  //       weapon.cooldown -= clampTime / 1000
  //     }
  //   },
  //   projectileTick: (projectile, i) => {
  //     projectile.life -= clampTime / 1000;
  //     if (projectile.life <= 0) {
  //       projectiles.splice(i, 1)
  //     }
  //   },
  //   drawTick: (projectile) => {

  //   },
  //   asteroidTick: () => { }
  // }
]

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
    collect: () => {
      player.shield++;
      if (player.shield > player.shieldLvl + 1) {
        player.shield = player.shieldLvl + 1;
      }
      player.score.pickups += 350;
    },
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
    collect: (e) => {
      player.score.other += 10000;
      player.stats.chests++;
      player.changedStats.chests++;
      let gotten = [];
      for (let i = 0; i < e.amount; i++) {
        let choices = upgrades.map((u, i) => ({ e: u, i: i })).filter(u => u.e.times < u.e.max).map(u => ({ i: u.i, type: "upgrade" }))
        player.weapons.forEach(weapon => {
          weapon.upgrades.forEach(upgrade => {
            if (upgrade.times < upgrade.max) choices.push({ type: "weapon", w: weapon, u: upgrade })
          })
        })
        if (choices.length > 0) {
          let choice = choices[floor(random() * choices.length)];
          if (choice.type == "upgrade") {
            upgrades[choice.i].f();
            upgrades[choice.i].times++;
            gotten.push({ name: upgrades[choice.i].name, times: upgrades[choice.i].times });
          } else {
            choice.u.onGet(choice.w);
            choice.w.onUpgrade(choice.w);
            choice.u.times++;
            gotten.push({ name: `${choice.w.name} - ${choice.u.name}`, times: choice.u.times });
          }
        } else {
          gotten.push({ name: "XP", times: 2000 });
          player.score.other += 2000;
        }
      }
      document.getElementById("chestItems").showModal();
      document.getElementById("upgradesGot").innerHTML = gotten.map(e => `<h2>${e.name} ${e.times}</h2>`).join("");
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
  },
  {
    col: "rgb(140, 135, 130)",
    weight: 0.3,
    collect: (e) => {
      player.score.pickups += 350;
      explosions.push({ pos: e.pos, vel: v(0, 0), size: 1000, tick: 0 });
      function split(c) {
        if (c > 0) {
          asteroids.forEach((a, i) => {
            if (p5.Vector.sub(a.pos, e.pos).mag() <= 1000) {
              a.hp -= 10;
              if (a.hp <= 0) {
                setTimeout(() => {
                  astSplit(a, p5.Vector.sub(a.pos, e.pos).heading());
                }, 50);
                asteroids.splice(i, 1);
                i--;
              }
            }
          });
          setTimeout(() => split(c - 1), 100);
        }
      }
      split(2);
    },
    draw: () => {
      fill("rgb(50, 30, 10)");
      stroke("rgb(100, 70, 60)");
      strokeWeight(5);
      circle(0, 5, 25);
      stroke("rgb(250, 240, 230)");
      line(0, -10, 0, -15);
      line(0, -15, -5, -15);
    }
  }
];

const bosses = [
  {
    time: 60,
    data: {
      pos: 500,
      vel: 0,
      size: 40,
      hp: 50,
      followPlayer: 0.02,
      chestItems: 2
    }
  }, {
    time: 120,
    data: {
      pos: 500,
      vel: 0,
      size: 50,
      hp: 175,
      followPlayer: 0.05,
      chestItems: 2
    }
  }, {
    time: 180,
    data: {
      pos: 500,
      vel: 0,
      size: 80,
      hp: 375,
      followPlayer: 0.1,
      chestItems: 3,
      bombs: 2,
      bombReload: 10
    }
  }, {
    time: 300,
    data: {
      pos: 500,
      vel: 0,
      size: 100,
      hp: 600,
      followPlayer: 0.3,
      chestItems: 3,
      bombs: 3,
      bombReload: 7,
    }
  }, {
    time: 420,
    data: {
      pos: 500,
      vel: 0,
      size: 150,
      hp: 1000,
      followPlayer: 0.3,
      chestItems: 4,
      bombs: 5,
      bombReload: 5
    }
  }, {
    time: 600,
    data: {
      pos: 1000,
      vel: 0,
      size: 350,
      hp: 2000,
      followPlayer: 0.7,
      chestItems: 5,
      bombs: 7,
      bombReload: 4
    }
  }, {
    time: 660,
    data: {
      pos: 1000,
      vel: 0,
      size: 50,
      hp: 500,
      followPlayer: 2,
      chestItems: 4,
      bombs: 10,
      bombReload: 3
    }
  }, {
    time: 720,
    data: {
      pos: 1000,
      vel: 0,
      size: 350,
      hp: 3000,
      followPlayer: 0.7,
      chestItems: 5,
      bombs: 12,
      bombReload: 2.5
    }
  }, {
    time: 900,
    data: {
      pos: 1000,
      vel: 0,
      size: 500,
      hp: 5000,
      followPlayer: 2.5,
      chestItems: 6,
      bombs: 15,
      bombReload: 2
    }
  }, {
    time: 1020,
    data: {
      pos: 1000,
      vel: 0,
      size: 300,
      hp: 5000,
      followPlayer: 2,
      chestItems: 5,
      bombs: 20,
      bombReload: 1.5
    }
  }
];

function setup() {
  world.size = v(worldSize, worldSize);
  size = v(innerWidth / resolution.value, innerHeight / resolution.value);
  if (size.x > world.size.x - 10) size.x = world.size.x - 10;
  if (size.y > world.size.y - 10) size.y = world.size.y - 10;

  createCanvas(size.x, size.y);
  frameRate(1000);
  window.onblur = () => {
    if (!levelUp && !pause && started) pauseGame();
  }
  mouseDown = false;
  if (Object.hasOwn(window, "Touch")) {
    movementTouch = { id: -1, pos: v(0, 0), down: false };
    dirTouch = { id: -1, pos: v(0, 0), down: false };
    document.getElementsByTagName("canvas")[0].addEventListener("mousedown", (e) => {
      mouseDown = true;
      let touches = [new Touch({ identifier: 0, target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY })];
      e.target.dispatchEvent(new TouchEvent("touchstart", { cancelable: true, touches: touches, changedTouches: touches }));
    });
    document.getElementsByTagName("canvas")[0].addEventListener("mousemove", (e) => {
      if (mouseDown) {
        let touches = [new Touch({ identifier: 0, target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY })];
        e.target.dispatchEvent(new TouchEvent("touchmove", { cancelable: true, touches: touches, changedTouches: touches }));
      }
    });
    document.getElementsByTagName("canvas")[0].addEventListener("mouseup", (e) => {
      mouseDown = false;
      let touches = [new Touch({ identifier: 0, target: e.target, clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, pageX: e.pageX, pageY: e.pageY })];
      e.target.dispatchEvent(new TouchEvent("touchend", { cancelable: true, touches: [], changedTouches: touches }));
    });
    document.getElementsByTagName("canvas")[0].addEventListener("touchstart", (e) => {
      [...e.changedTouches].forEach((t) => {
        let p = v(t.pageX, t.pageY);
        let s1 = p5.Vector.sub(p, v(40, 145));
        if (s1.x > -20 && s1.x < 20 && s1.y > -20 && s1.y < 20 && !pause) {
          pauseGame();
        }
        if (prefers.showTouchControls) {
          if (p5.Vector.sub(p, v(125, size.y + prefers.touchControlHeight / 2)).mag() <= 60) {
            e.preventDefault();
            movementTouch = { id: t.identifier, pos: p5.Vector.sub(p, v(125, size.y + prefers.touchControlHeight / 2)), down: true };
          }
          if (p5.Vector.sub(p, v(size.x - 125, size.y + prefers.touchControlHeight / 2)).mag() <= 60) {
            e.preventDefault();
            dirTouch = { id: t.identifier, pos: p5.Vector.sub(p, v(size.x - 125, size.y + prefers.touchControlHeight / 2)), down: true };
          }
          s1 = p5.Vector.sub(p, v(size.x / 2, size.y + prefers.touchControlHeight / 2));
          if (s1.x > -30 && s1.x < 30 && s1.y > -30 && s1.y < 30) {
            prefers.autoFire = !prefers.autoFire;
          }
        }
      });
    });
    document.getElementsByTagName("canvas")[0].addEventListener("touchmove", (e) => {
      if (prefers.showTouchControls) {
        [...e.changedTouches].forEach((t) => {
          let p = v(t.pageX, t.pageY);
          if (t.identifier == movementTouch.id) {
            e.preventDefault();
            movementTouch.pos = p5.Vector.sub(p, v(125, size.y + prefers.touchControlHeight / 2));
            if (movementTouch.pos.mag() > 40) {
              movementTouch.pos.normalize();
              movementTouch.pos.mult(40);
            }
          }
          if (t.identifier == dirTouch.id) {
            e.preventDefault();
            dirTouch.pos = p5.Vector.sub(p, v(size.x - 125, size.y + prefers.touchControlHeight / 2));
            dirTouch.pos.normalize();
            dirTouch.pos.mult(40);
          }
        });
      }
    });
    document.getElementsByTagName("canvas")[0].addEventListener("touchend", (e) => {
      if (prefers.showTouchControls) {
        [...e.changedTouches].forEach((t) => {
          if (t.identifier == movementTouch.id) {
            e.preventDefault();
            movementTouch.down = false;
            movementTouch.id = -1;
            movementTouch.pos = v(0, 0);
          }
          if (t.identifier == dirTouch.id) {
            e.preventDefault();
            dirTouch.down = false;
            dirTouch.id = -1;
          }
        });
      }
    });
  } else {
    movementTouch = undefined;
    dirTouch = undefined;
  }
  setupVars();
  setInterval(() => {
    player.changedStats.username = username;
    setUser({ relative: true }, JSON.parse(JSON.stringify(player.changedStats)));
    Object.keys(player.changedStats).forEach((k) => {
      player.changedStats[k] = 0;
    });
  }, 10000);
}
function setupVars() {
  upgrades.forEach((e) => {
    e.times = 0;
  });
  setUser({ relative: true }, { runs: 1 });
  tick = 0;
  pause = false;
  bossFight = false;
  maxFight = -1;
  levelUp = false;
  levelUpgrades = [];
  pauseBtns = [];
  oldBtns = [];
  asteroids = [];
  explosions = [];
  world.pickups = [];
  asteroidSpawnTimer = 0;
  asteroidSpawnRate = 250;
  asteroidSpeed = 2;
  timer = 0;
  started = false;
  player = {
    pos: v(0, 0),
    vel: v(0, 0),
    dir: 0,
    dirVel: 0,
    hp: 5,
    maxHp: 5,
    alive: true,
    restart: false,
    score: {
      kills: 0,
      pickups: 0,
      other: 0
    },
    stats: {
      kills: 0,
      pickups: 0,
      chests: 0,
      bulletsFired: 0,
      bulletsHit: 0,
      upgrades: 0
    },
    changedStats: {
      kills: 0,
      pickups: 0,
      chests: 0,
      bulletsFired: 0,
      bulletsHit: 0,
      upgrades: 0,
      timePlayed: 0
    },
    iframe: 0,
    xp: 0,
    lvlUp: 50,
    lvl: 0,
    speed: 0.4,
    shield: 0,
    shieldLvl: 0,
    weapons: [],
    shieldRegen: 120,
    shieldRegenTime: 120
  };
  for (let i = 0; i < 10; i += 0.3 / (i + 2)) {
    asteroids.push({ pos: v(i * world.size.mag() / 10 + 100, 0).rotate(random() * 2 * PI), vel: v(random() * 3, 0).rotate(random() * 2 * PI), size: random() * 20 + 20 });
  }
  document.getElementById("startMenu").showModal();
  document.getElementById("startButton").addEventListener("click", () => {
    started = true;
    document.getElementById("startMenu").close();
    asteroids = [];
    levelUp = true;
    startLevelUp(true);
  });

  weapons.forEach((e) => {
    if (e.starter) e.onGet();
  });

  // testing, all pickups
  // for (let j = 0; 5 > j++;) {
  //   for (let i = 0; i < pickupData.length; i++) {
  //     world.pickups.push({ pos: v(i * 100 - pickupData.length * 50 + 530, -1000 + j * 50), type: 3, amount: 10 })
  //   }
  // }
}

function draw() {
  clampTime = Math.min(deltaTime, 100);
  if (started) {
    if (!pause && !levelUp) {
      tick++;
      player.changedStats.timePlayed += clampTime / 1000;
      if (bossFight) {
        if (asteroids.filter(e => e.boss && e.original).length == 0) {
          bossFight = false;
        }
      } else {
        if (tick < 15) asteroidSpawnTimer = 0;
        if (asteroidSpawnTimer <= 0 && player.alive) {
          asteroidSpawnTimer = asteroidSpawnRate;
          asteroidSpawnRate *= 0.925;
          if (asteroidSpawnRate < 50) asteroidSpawnRate = 50;
          asteroidSpeed += 0.005;
          asteroids.push({
            pos: p5.Vector.add(player.pos, v(size.x / 2, 0).rotate(random() * 2 * PI)),
            vel: v(random() * asteroidSpeed, 0).rotate(random() * 2 * PI),
            size: 40, hp: 2 + floor(timer / 100),
            original: true
          });
        } else {
          asteroidSpawnTimer -= 0.03 * clampTime;
        }
      }
      if (player.alive) {
        bosses.forEach((e, i) => {
          if (timer >= e.time && maxFight < i) {
            asteroids.push(JSON.parse(JSON.stringify(e.data)));
            bossFight = true;
            maxFight = i;
            boss = asteroids[asteroids.length - 1];
            boss.original = true;
            boss.boss = true;
            boss.type = i;
            boss.bombCooldown = 0;
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
      player.pos.add(p5.Vector.mult(player.vel, clampTime * 0.03));
      player.vel.mult(0.95);
      if (player.alive) {
        timer += clampTime / 1000;

        let joy = v(keyIsDown(68) - keyIsDown(65), keyIsDown(83) - keyIsDown(87)).normalize();
        if (prefers.controls == 0) {
          let dst = v(joy.y, 0).rotate(player.dir).mult(-player.speed * clampTime * 0.03);
          player.vel.add(dst);
          player.dirVel += joy.x * 0.0009 * clampTime;
          player.dir += player.dirVel * clampTime * 0.03;
          player.dirVel *= 0.9;
        } else if (prefers.controls == 1) {
          player.vel.add(p5.Vector.mult(joy, (player.speed + 0.1) * 0.03 * clampTime));
          player.dir = p5.Vector.sub(v(mouseX, mouseY), p5.Vector.div(size, 2)).heading();
        } else if (prefers.controls == 2) {
          player.vel.add(p5.Vector.mult(joy, (player.speed + 0.1) * 0.03 * clampTime));
          let newDir = v(keyIsDown(39) - keyIsDown(37), keyIsDown(40) - keyIsDown(38));
          if (newDir.mag() > 0) {
            newDir = newDir.heading();
            let dst = player.dir - newDir;
            if (dst > PI) dst -= 2 * PI;
            if (dst < -PI) dst += 2 * PI;
            dst *= 0.1;
            player.dir -= dst;
          }
        }
        if (prefers.showTouchControls && typeof movementTouch != "undefined" && typeof dirTouch != "undefined") {
          player.vel.add(p5.Vector.mult(movementTouch.pos, (player.speed + 0.1) / 40 * 0.03 * clampTime));
          player.dir = dirTouch.pos.heading();
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
        if (player.hp <= 0) {
          player.alive = false;
          world.screenshake.set(8, 8, 1)
          explosions.push({ pos: player.pos.copy(), vel: player.vel.copy(), size: 70, tick: 0 });

          showDeathScreen();

          //https://stackoverflow.com/questions/16449295/how-to-sum-the-values-of-a-javascript-object
          if (Object.values(player.score).reduce((a, b) => a + b, 0) >= Object.values(JSON.parse((localStorage.getItem("highscore")))).reduce((a, b) => a + b, 0)) localStorage.setItem("highscore", JSON.stringify(player.score));
        }
        if (player.shieldRegen <= 0) {
          player.shieldRegen = player.shieldRegenTime;
          player.shield++;
          if (player.shield > player.shieldLvl + 1) {
            player.shield = player.shieldLvl + 1;
          }
        } else {
          player.shieldRegenTime -= clampTime / 1000;
        }
        player.weapons.forEach(weapon => {
          weapon?.tick(weapon);
        })
        projectiles.forEach((projectile, i) => {
          weapons.find(x => x.id == projectile.type)?.projectileTick(projectile, i)
        })

      }


      asteroids.forEach((e, i) => {
        if (!Object.hasOwn(e, "boss")) e.boss = false;
        if (!Object.hasOwn(e, "closest")) e.closest = v(0, 0);
        if (e.vel.mag() > 10 + e.followPlayer * 10) {
          e.vel.normalize();
          e.vel.mult(10 + e.followPlayer * 10);
        }
        if (e.hp <= 0) {
          astSplit(e, random() * 2 * PI);
          asteroids.splice(i, 1);
          i--;
        }
        if (e.boss && e.bombs > 0) {
          if (e.bombCooldown <= 0) {
            e.bombCooldown = e.bombReload;
            for (let i = 0; i < e.bombs; i++) {
              let s = sqrt(e.bombs * 50000);
              projectiles.push({ type: "bomb", pos: p5.Vector.add(player.pos, v(s * (random() - 0.5), s * (random() - 0.5))), time: 0, rad: 50, closest: v(0, 0) });
            }
          } else {
            e.bombCooldown -= clampTime / 1000;
          }
        }
        e.pos.add(p5.Vector.mult(e.vel, clampTime * 0.03));
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
          dst.add(e.closest);
          if (dst.mag() < e.size / 2 + 25 + (player.shield ? 1 : 0) * 10) {
            if (player.iframe <= 0) {
              if (player.shield > 0) {
                player.shield--;
              } else {
                player.hp--;
              }
              e.hp--;
              player.iframe = 10;
            }
            dst = dst.normalize();
            dst.mult(e.size / 2 + 25 + (player.shield ? 1 : 0) * 10);
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
          }
          projectiles.forEach((projectile, projectileIndex) => {
            weapons.find(x => x.id == projectile.type)?.asteroidTick(projectile, projectileIndex, e, i)
          })
          if (e.followPlayer > 0) {
            dst.normalize();
            dst.mult(e.followPlayer * 0.03 * clampTime);
            e.vel.sub(dst);
          }
        }
      });
      explosions.forEach((e, i) => {
        if (e.tick >= 2) {
          explosions.splice(i, 1);
        }
        e.tick += clampTime * 0.04 / Math.pow(e.size, 0.3);
      });
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
          fill(230);
          stroke(200);
          strokeWeight(e.size * 0.1);
          ellipse(e.pos.x, e.pos.y, e.tick * e.size, e.tick * e.size);
        });
        pop();
      }
    }
    for (let xOff = -world.size.x; xOff <= world.size.x; xOff += world.size.x) {
      for (let yOff = -world.size.y; yOff <= world.size.y; yOff += world.size.y) {
        push();
        translate(xOff, yOff);
        stroke(255);
        strokeWeight(5);
        fill(0);
        world.pickups.forEach((pickup, i) => {
          push();
          translate(pickup.pos);
          pickupData[pickup.type].draw();
          pop();
          let pos = p5.Vector.add(pickup.pos, v(xOff, yOff));
          if (p5.Vector.sub(pos, player.pos).mag() <= 50) {
            world.pickups.splice(i, 1);
            pickupData[pickup.type].collect(pickup);
            player.stats.pickups++;
            player.changedStats.pickups++;
          }
          if (p5.Vector.sub(pos, player.pos).mag() < p5.Vector.sub(p5.Vector.add(pickup.pos, pickup.closest), player.pos).mag()) {
            pickup.closest = v(xOff, yOff);
          }
        });
        asteroids.sort((a, b) => a.size - b.size).forEach((a) => {
          let p = p5.Vector.sub(p5.Vector.add(a.pos, v(xOff, yOff)), player.pos);
          if (p.x > -size.x / 2 - a.size / 2 && p.x < size.x / 2 + a.size / 2 && p.y > -size.y / 2 - a.size / 2 && p.y < size.y / 2 + a.size / 2) {
            push();
            if (a.followPlayer > 0) {
              stroke("rgb(255,150,150)");
              fill("rgba(100,0,0,0.5)");
            } else {
              stroke(255);
              fill("rgba(0,0,0,0.5)");
            }
            ellipse(a.pos.x, a.pos.y, a.size, a.size);
            if (a.boss) {
              stroke(0);
              fill(50);
              strokeWeight(3);
              let w = a.size + 10;
              rect(a.pos.x - w / 2, a.pos.y + a.size / 2 + 10, w, 15);
              let nw = w * a.hp / bosses[a.type].data.hp;
              fill("rgb(250,50,0)");
              rect(a.pos.x - w / 2, a.pos.y + a.size / 2 + 10, nw, 15);
            }
            pop();
          }
          if (p5.Vector.sub(p5.Vector.add(a.pos, v(xOff, yOff)), player.pos).mag() < p5.Vector.sub(p5.Vector.add(a.pos, a.closest), player.pos).mag()) {
            a.closest = v(xOff, yOff);
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
      if (prefers.controls == 0 || prefers.controls == 2) {
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
      if (player.shield > 0) {
        fill(`rgba(${50 + player.shield * 50}, ${200 - player.shield * 20}, 250, 0.3)`);
        // stroke("rgb(0, 150, 250)");
        stroke(`rgb(${50 + player.shield * 50}, ${200 - player.shield * 20}, 250)`)
        strokeWeight(5);
        circle(0, 0, 65);
      }
      pop();
      projectiles.forEach((projectile) => {
        weapons.find(x => x.id == projectile.type)?.drawTick(projectile)
      });
    }
    if (player.alive) {
      drawPointerArrows();
    } else {
      if (keyIsDown(32) && !player.restart) {
        setupVars();
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
    if (prefers.controls == 1 && !pause && !levelUp && (!prefers.showTouchControls || (prefers.showTouchControls && mouseY <= size.y))) {
      line(-15, -10, -10, -15);
      line(15, 10, 10, 15);
      line(-15, 10, -10, 15);
      line(15, -10, 10, -15);
      line(-5, 0, 5, 0);
      line(0, -5, 0, 5);
      canvas.style.cursor = "none";
    } else if (prefers.showTouchControls && mouseY > size.y - 5 && mouseY < size.y + 5) {
      canvas.style.cursor = "row-resize";
    } else {
      canvas.style.cursor = "unset";
    }
    pop();

    player.restart = keyIsDown(32);

    if (typeof movementTouch != "undefined" && typeof dirTouch != "undefined") {
      fill(0);
      stroke(255);
      strokeWeight(5);
      rect(20, 120, 30, 30, 5);
      line(30, 130, 30, 140);
      line(40, 130, 40, 140);
    }

    if (prefers.showTouchControls && typeof movementTouch != "undefined" && typeof dirTouch != "undefined") {
      push();
      translate(0, size.y + prefers.touchControlHeight / 2);
      fill(0);
      stroke(50);
      strokeWeight(5);
      rect(0, -prefers.touchControlHeight / 2, size.x, prefers.touchControlHeight);
      //movement stick
      fill(80);
      stroke(70);
      strokeWeight(10);
      circle(125, 0, 100);
      fill(120);
      stroke(110);
      strokeWeight(5);
      circle(125 + movementTouch.pos.x, movementTouch.pos.y, 30);
      //direction stick
      fill(80);
      stroke(70);
      strokeWeight(10);
      circle(size.x - 125, 0, 100);
      fill(120);
      stroke(110);
      strokeWeight(5);
      circle(size.x - 125 + dirTouch.pos.x, dirTouch.pos.y, 30);
      //toggle fire
      fill(prefers.autoFire ? 120 : 80);
      stroke(prefers.autoFire ? 110 : 70);
      strokeWeight(10);
      rect(size.x / 2 - 30, -30, 60, 60, 5);
      pop();
    }
  } else {
    background(0);
    push();
    translate(innerWidth / 2, innerHeight / 2);
    fill(0);
    stroke(250);
    strokeWeight(5);
    asteroids.sort((a, b) => a.size - b.size).forEach((e) => {
      fill("rgba(0,0,0,0.5)");
      ellipse(e.pos.x, e.pos.y, e.size, e.size);
      e.pos.add(p5.Vector.mult(e.vel, clampTime * 0.03));
    });
    background("rgba(0,0,0,0.5)");
    fill(0);
    triangle(-15, -15, -15, 15, 20, 0);
    pop();
  }
}

function updateCanvasSize() {
  size.set(innerWidth / resolution.value, innerHeight / resolution.value);
  if (size.x > world.size.x - 10) size.x = world.size.x - 10;
  if (size.y > world.size.y - 10) size.y = world.size.y - 10;
  resizeCanvas(size.x, size.y, true);
  if (prefers.showTouchControls && typeof movementTouch != "undefined" && typeof dirTouch != "undefined") {
    size.y -= prefers.touchControlHeight;
  }
  document.querySelector(".p5Canvas").style.transform = `scale(${resolution.value}) translate(-50%, -50%)`
}

addEventListener("resize", updateCanvasSize);
document.getElementById("showTouchControls").addEventListener("input", () => setTimeout(updateCanvasSize, 50));
resolution.addEventListener("input", updateCanvasSize)

function drawPauseMenu() {
  document.getElementById("control").innerHTML = ["AD Turning", "Mouse + WASD", "WASD + Arrow Turning"][prefers.controls];
}

function getCanPause() {
  let response = true
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    if (dialog.id !== "pauseMenu") response = false
  })
  if (Object.keys(vex.getAll()).length > 0) {
    response = false // Prompt or alert is currently active!!!!
  }
  return response
}

function pauseGame() {
  let canPause = getCanPause()
  if (!canPause) {
    return
  }
  setTimeout(() => {
    pause = true;

    //drawing upgrades
    const upgradeElement = document.querySelector("#upgrades");

    upgradeElement.innerHTML = "<b>Player:</b><br>" + upgrades.map(upgrade => upgrade.times > 0 ? `${upgrade.name}: ${upgrade.times}/${upgrade.max}<br>` : "").join("")

    player.weapons.forEach(weapon => {
      upgradeElement.innerHTML += `<b>${weapon.name}</b><br> + ${weapon.upgrades.map(upgrade => upgrade.times > 0 ? `${upgrade.name}: ${upgrade.times}/${upgrade.max}<br>` : "").join("")}`
    })
    upgradeElement.innerHTML += `${version} (${pageTime.toLocaleDateString().replaceAll("/", ".")}.${pageTime.getHours()})`

    document.getElementById("pauseMenu").showModal();
    document.getElementById("resume").addEventListener("click", () => { pause = false; document.getElementById("pauseMenu").close() });
    document.getElementById("quit").addEventListener("click", () => { player.hp = 0; pause = false; document.getElementById("pauseMenu").close() });
    //document.getElementById("exit").addEventListener("click", () => noLoop());
    document.getElementById("control").addEventListener("click", () => { prefers.controls++; if (prefers.controls > 2) prefers.controls -= 3 });
    if (!Object.hasOwn(window, "Touch")) {
      document.getElementById("showTouchControls").parentElement.setAttribute("class", "disabledText");
      document.getElementById("showTouchControls").parentElement.innerHTML = "Your browser does not<br>support touch controls";
    }
    [...document.getElementById("pauseMenu").querySelectorAll("label")].forEach(label => {
      const checkbox = label.querySelector("input[type='checkbox']")
      checkbox.checked = prefers[checkbox.id];
    });
  }, 100);
}

[...document.getElementById("pauseMenu").querySelectorAll("label")].forEach(label => {
  const checkbox = label.querySelector("input[type='checkbox']")
  checkbox.addEventListener("input", (e) => {
    prefers[e.target.id] = e.target.checked
  })
})

function startLevelUp(isFirstUpgrade) {
  player.stats.upgrades++;
  player.changedStats.upgrades++;
  let choices = [];
  upgrades.forEach((e, i) => {
    if (e.times < e.max) {
      for (let n = 0; n < e.weight; n += 0.05) {
        choices.push({ name: e.name, f: e.f, description: e.description, i: i, type: "normal" });
      }
    }
  });
  weapons.forEach((weapon, i) => {
    if (!player.weapons.find(x => x.id == weapon.id)) {
      for (let n = 0; n < weapon.weight; n += 0.05) {
        choices.push({ name: weapon.name, f: weapon.onGet, description: weapon.description, i: -1, type: "weapon" })
      }
    } else {
      const playerWeapons = player.weapons.filter(x => x.id == weapon.id);
      playerWeapons.forEach(playerWeapon => {
        playerWeapon.upgrades.forEach((upgrade, i) => {
          if (upgrade.times < upgrade.max) {
            for (let n = 0; n < upgrade.weight; n += 0.05) {
              choices.push({ name: `${playerWeapon.name} - ${upgrade.name}`, f: () => { upgrade.onGet(playerWeapon); upgrade.times++; weapon?.onUpgrade(weapon) }, description: upgrade.desc, type: "weaponUpgrade", self: upgrade, rarity: upgrade.rarity })
            }
          }
        });
      });
    }
  });
  levelUpgrades = [];
  if (choices.length > 0) {
    for (let n = 0; n < 3; n++) {
      if (choices.length > 0) {
        let r = floor(random() * choices.length);
        levelUpgrades.push(choices[r]);
        choices = choices.filter(e => e.name != choices[r].name);
      }
    }
  } else {
    levelUpgrades.push({ name: "XP", f: () => { player.score.other += 2000 }, description: "Adds 2000 xp", i: -1, type: "normal" });
    levelUpgrades.push({ name: "Health", f: () => { player.hp += 1 }, description: "Restores 1 additional health", i: -1, type: "normal" });
  }
  if (isFirstUpgrade === true) {
    document.querySelector("#levelUpDialog > h1").innerText = "Pick a starter"
  } else {
    document.querySelector("#levelUpDialog > h1").innerText = "Level Up!"
  }
  document.getElementById("levelUpDialog").showModal();

  document.getElementById("choices").innerHTML = levelUpgrades.map((upgrade, i) => {
    if (upgrade.type == "normal") {
      return `<button id="levelUp${i}" style="background-color:${upgrade.i == -1 ? rarityData["-1"] : rarityData[upgrades[upgrade.i].rarity]};"><h2>${upgrade.name}</h2><p>${upgrade.description}</p>${upgrade.i > -1 ? `<p>${upgrades[upgrade.i].times}/${upgrades[upgrade.i].max}</p>` : ""}</button>`
    } else if (upgrade.type == "weapon") {
      return `<button id="levelUp${i}" style="background-color:${rarityData[3]};"><h2>${upgrade.name}</h2><p>${upgrade.description}</p></button>`
    } else if (upgrade.type == "weaponUpgrade") {
      return `<button id="levelUp${i}" style="background-color:${rarityData[upgrade.rarity]};"><h2>${upgrade.name}</h2><p>${upgrade.description}</p><p>${upgrade.self.times}/${upgrade.self.max}</p></button>`
    }
  }).join("<br/>");
  levelUpgrades.forEach((e, i) => {
    document.getElementById("levelUp" + i).addEventListener("click", () => {
      if (e.i > -1 && e.type == "normal") upgrades[e.i].times++;
      e.f();
      levelUp = false;
      document.getElementById("levelUpDialog").close();
      levelUpgrades = [];
    });
  });
}

async function showDeathScreen() {
  const fullPlayerScore = Object.values(player.score).reduce((a, b) => a + b, 0);
  const fullHighscore = Object.values(JSON.parse(localStorage.getItem("highscore"))).reduce((a, b) => a + b, 0);
  const deathScreen = document.getElementById("deathDialog");

  async function tryUsername(wasInvalid = false) {
    try {
      await setUsername(wasInvalid)
    } catch (e) {
      vex.closeAll()
      await new Promise((r) => setTimeout(r, 700));
      await tryUsername(true)
    }
  }
  if (!localStorage.getItem("username")) {
    pause = true
    await tryUsername(false)
    pause = false
  }

  deathScreen.showModal();
  deathScreen.querySelector("span").innerHTML = `
    Your score: ${fullPlayerScore.toLocaleString()}<br>
    Your Highscore: ${fullHighscore.toLocaleString()}<br>
  `;
  document.getElementById("leaderboard").innerHTML = "loading leaderboard...";

  submitScore(username, timer, player.score, version).then(async () => {

    const globalHighscores = await getScores();
    document.getElementById("leaderboard").innerHTML = "<h2>Leaderboard:</h2>";
    renderHighscores(globalHighscores)

    if (fullPlayerScore >= fullHighscore) {
      deathScreen.querySelector("span").innerHTML = `
        New Highscore! ${fullPlayerScore.toLocaleString()}<br>
      `;
    }
  });

  document.getElementById("runStats").innerHTML = `
  <h2>Run stats:</h2>
  <span>Kills: ${player.stats.kills}</span><br>
  <span>Shots fired: ${player.stats.bulletsFired}</span><br>
  <span>Shots hit: ${player.stats.bulletsHit}</span><br>
  <span>Hit accuracy: ${player.stats.bulletsFired > 0 ? round(player.stats.bulletsHit / player.stats.bulletsFired * 1000) / 10 : 0}%</span><br>
  <span>Upgrades: ${player.stats.upgrades}</span><br>`;

  document.getElementById("totalStats").innerHTML = "<span>loading stats...</span>";
  setUser({ relative: true }, JSON.parse(JSON.stringify(player.changedStats))).then(async () => {
    let user = await getUser();
    document.getElementById("totalStats").innerHTML = `
    <h2>Total stats:</h2>
    <span>Runs: ${user.runs}</span><br>
    <span>Time played: ${floor(user.timePlayed / 3600)}:${floor(user.timePlayed / 60)}</span><br>
    <span>Kills: ${user.kills}</span><br>
    <span>Shots fired: ${user.bulletsFired}</span><br>
    <span>Shots hit: ${user.bulletsHit}</span><br>
    <span>Hit accuracy: ${Math.round(user.bulletsHit / user.bulletsFired * 1000) / 10}%</span><br>
    <span>Upgrades: ${user.upgrades}</span><br>`;
  });
}

let loadMoreButton = document.getElementById("loadMoreButton");

async function loadMoreScores(startingAt, i) {
  const scores = await getScores(startingAt);
  renderHighscores(scores, i)
}

function renderHighscores(highscores, i = null) {
  if (i == null) {
    i = 0;
  }
  highscores.forEach(score => {
    i++;
    const data = score.data();
    const time = Math.floor(data.time);
    const minutes = Math.floor(time / 60);
    const seconds = time - minutes * 60;
    let htmlString = `${i}. <b>${data.username}</b>: ${data.total.toLocaleString()} - ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`

    if (Object.hasOwn(data, "version") && data.version !== version) {
      htmlString = `<span class="wrongVersion" title="This record was achieved on version ${data.version}, the game may have been rebalanced since then.">${htmlString}</span>`
    }

    document.getElementById("leaderboard").innerHTML += htmlString + "<br>";

    if (i % 10 == 0) {
      var old_element = loadMoreButton;
      loadMoreButton = old_element.cloneNode(true);
      old_element.parentNode.replaceChild(loadMoreButton, old_element);

      loadMoreButton.addEventListener("click", () => loadMoreScores(score, i))
    }
  })
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
      if (e.followPlayer > 0) {
        fill("rgb(255,150,150)");
      } else {
        fill(255);
      }
      let s = (e.size * 100) / (asteroids.length + 100);
      if (e.boss) s = e.size * 2;
      ellipse(e.pos.x, e.pos.y, s, s);
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
    let drawArrow = (pos, col, aSize, rad) => {
      let dif = p5.Vector.sub(player.pos, pos);
      let render = false;
      let s = p5.Vector.sub(size, v(20, 20));
      if (dif.x <= -s.x / 2 - rad) {
        render = true;
        dif.div(dif.x / (-s.x / 2));
      }
      if (dif.y <= -s.y / 2 - rad) {
        render = true;
        dif.div(dif.y / (-s.y / 2));
      }
      if (dif.x >= s.x / 2 - rad) {
        render = true;
        dif.div(dif.x / (s.x / 2));
      }
      if (dif.y >= s.y / 2 - rad) {
        render = true;
        dif.div(dif.y / (s.y / 2));
      }
      if (render) {
        push();
        translate(p5.Vector.mult(dif, -1));
        rotate(dif.heading());
        fill(col);
        noStroke();
        triangle(aSize, -aSize, aSize, aSize, -aSize * 1.5, 0);
        pop();
      }
    }
    world.pickups.forEach((e) => {
      drawArrow(p5.Vector.add(e.pos, e.closest), pickupData[e.type].col, 10, 10);
    });
    asteroids.forEach((e) => {
      if (e.boss) drawArrow(p5.Vector.add(e.pos, e.closest), "rgb(240,100,100)", 15, e.size / 2);
    });
  }
}

function v(x, y) {
  return createVector(x, y);
}
function astSplit(a, dir) {
  player.stats.kills++;
  player.changedStats.kills++;
  explosions.push({ pos: a.pos.copy(), vel: a.vel.copy(), tick: 0, size: a.size });
  world.screenshake.set(a.size * screenshakeModifier, a.size * screenshakeModifier, 0.1)
  player.score.kills += a.size > 35 ? 150 : (a.size > 25 ? 100 : 75);
  player.xp += a.size > 35 ? 2 : 1;
  if (a.boss && a.original) {
    world.pickups.push({ type: 3, pos: a.pos, amount: a.chestItems });
  }
  if (a.size > 35 && random() < 0.5) {
    asteroidSpawnTimer = 0;
  }
  if (random() < (a.size / 100 - 0.2) * 0.1 * Math.pow(120, 1.5) / Math.pow(timer + 120, 1.5) + 0.005 && !a.boss && !a.original) {
    let choices = [];
    pickupData.forEach((option, i) => {
      for (let n = 0; n < option.weight * 20; n++) choices.push(i);
    });
    world.pickups.push({ type: choices[floor(random() * choices.length)], pos: a.pos });
  }
  if (a.size > 35 && random() < 0.5) {
    asteroidSpawnTimer = 0;
  }
  if (a.size >= 25) {
    let num = (a.boss ? 4 : 3) - (timer > 300 ? 1 : 0);
    for (let i = -1; i <= 1; i += 2 / (num - 1)) {
      asteroids.push({
        pos: a.pos.copy(),
        vel: p5.Vector.add(a.vel, v(3, 0).rotate(dir + i)),
        size: a.size * (a.boss ? (3 / 5) : (3 / 4)),
        hp: round(a.size / (a.boss ? 20 : 25)) + floor(timer / 100) * 0.5,
        boss: false,
        followPlayer: a.followPlayer / 4 * 3,
        original: false
      });
      asteroids[asteroids.length - 1].pos.add(
        p5.Vector.mult(p5.Vector.sub(asteroids[asteroids.length - 1].vel, a.vel), a.size / 6)
      );
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key == "Escape") {
    if (!getCanPause()) return
    pause = !pause;
    if (pause) pauseGame();
  } else if (e.key == "z") {
    prefers.autoFire = !prefers.autoFire;
  }
});