  (() => {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const hpBar = document.getElementById("hp-bar");
    const xpBar = document.getElementById("xp-bar");
    const timerEl = document.getElementById("timer");
    const lootEl = document.getElementById("kills");
    const levelEl = document.getElementById("level");
    const startEl = document.getElementById("start");
    const overEl = document.getElementById("over");
    const overStats = document.getElementById("over-stats");
    const levelupEl = document.getElementById("levelup");
    const choicesEl = document.getElementById("choices");

    const WORLD = 4200;
    const keys = Object.create(null);
    let running = false;
    let paused = false;
    let last = 0;
    let state;
    let nextId = 1;

    const TIERS = [
      {
        id: "meter",
        name: "Meter Maid",
        hp: 12,
        speed: 78,
        dmg: 6,
        xp: 4,
        cash: 5,
        r: 14,
        color: "#d4a017",
        hat: "#c0392b",
      },
      {
        id: "cop",
        name: "Beat Cop",
        hp: 22,
        speed: 92,
        dmg: 9,
        xp: 7,
        cash: 12,
        r: 16,
        color: "#2c5aa0",
        hat: "#1a335c",
      },
      {
        id: "sheriff",
        name: "Sheriff",
        hp: 40,
        speed: 88,
        dmg: 12,
        xp: 12,
        cash: 22,
        r: 17,
        color: "#3d6b3d",
        hat: "#c9a227",
      },
      {
        id: "swat",
        name: "SWAT",
        hp: 70,
        speed: 80,
        dmg: 16,
        xp: 18,
        cash: 35,
        r: 18,
        color: "#2b2f36",
        hat: "#111318",
      },
      {
        id: "fbi",
        name: "FBI",
        hp: 110,
        speed: 100,
        dmg: 20,
        xp: 28,
        cash: 55,
        r: 18,
        color: "#1b1e26",
        hat: "#e8e8e8",
      },
      {
        id: "cia",
        name: "CIA",
        hp: 160,
        speed: 118,
        dmg: 24,
        xp: 40,
        cash: 80,
        r: 17,
        color: "#4a5560",
        hat: "#2f3640",
      },
      {
        id: "irs",
        name: "IRS Agent",
        hp: 240,
        speed: 96,
        dmg: 30,
        xp: 55,
        cash: 120,
        r: 19,
        color: "#5c2e1a",
        hat: "#8b4513",
      },
      {
        id: "interpol",
        name: "Interpol",
        hp: 360,
        speed: 110,
        dmg: 36,
        xp: 80,
        cash: 180,
        r: 20,
        color: "#103060",
        hat: "#0a1c3a",
      },
    ];

    function xpNeeded(level) {
      return Math.floor(18 + level * 14 + level * level * 1.6);
    }

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function dist(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    }

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function pick(arr) {
      return arr[(Math.random() * arr.length) | 0];
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("keydown", (e) => {
      keys[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    function spawnOnRing(cx, cy, minR, maxR) {
      const ang = Math.random() * Math.PI * 2;
      const r = rand(minR, maxR);
      return {
        x: clamp(cx + Math.cos(ang) * r, 40, WORLD - 40),
        y: clamp(cy + Math.sin(ang) * r, 40, WORLD - 40),
      };
    }

    function makePlayer() {
      return {
        x: WORLD / 2,
        y: WORLD / 2,
        r: 16,
        hp: 100,
        maxHp: 100,
        speed: 165,
        xp: 0,
        level: 1,
        cash: 0,
        invuln: 0,
        pickup: 70,
        damageMul: 1,
        fireMul: 1,
        armor: 0,
        regen: 0,
        crit: 0.05,
        critMul: 1.8,
        projExtra: 0,
        pierceBonus: 0,
        knockback: 40,
        xpMul: 1,
        cashMul: 1,
        projSize: 1,
        projSpeed: 1,
        dodge: 0,
        thorns: 0,
        bounce: 0,
        orbitCount: 0,
        orbitR: 78,
        orbitDmg: 14,
        auraR: 0,
        auraDmg: 0,
        gemPull: 280,
        weapons: [{ id: "coins", cd: 0, level: 1 }],
      };
    }

    function reset() {
      state = {
        t: 0,
        player: makePlayer(),
        enemies: [],
        bullets: [],
        gems: [],
        particles: [],
        zones: [],
        spawnAcc: 0,
        cam: { x: 0, y: 0 },
        buildings: [],
        over: false,
      };
      for (let i = 0; i < 70; i++) {
        state.buildings.push({
          x: rand(80, WORLD - 280),
          y: rand(80, WORLD - 280),
          w: rand(90, 220),
          h: rand(90, 220),
          shade: rand(0.08, 0.18),
        });
      }
    }

    function currentTiers(time) {
      if (time < 25) return [TIERS[0], TIERS[1]];
      if (time < 50) return [TIERS[1], TIERS[2]];
      if (time < 80) return [TIERS[1], TIERS[2], TIERS[3]];
      if (time < 110) return [TIERS[2], TIERS[3], TIERS[4]];
      if (time < 145) return [TIERS[3], TIERS[4], TIERS[5]];
      if (time < 185) return [TIERS[4], TIERS[5], TIERS[6]];
      return [TIERS[5], TIERS[6], TIERS[7]];
    }

    function spawnRate(time) {
      return 0.55 + time * 0.018;
    }

    function spawnEnemy() {
      const p = state.player;
      const edge = Math.max(canvas.width, canvas.height) * 0.52;
      const pos = spawnOnRing(p.x, p.y, edge, edge + 160);
      const pool = currentTiers(state.t);
      const def = pick(pool);
      const elite = Math.random() < Math.min(0.12, state.t / 400);
      state.enemies.push({
        uid: nextId++,
        ...pos,
        r: def.r * (elite ? 1.35 : 1),
        hp: def.hp * (elite ? 2.4 : 1) * (1 + state.t / 220),
        maxHp: def.hp * (elite ? 2.4 : 1) * (1 + state.t / 220),
        speed: def.speed * (elite ? 0.9 : 1),
        dmg: def.dmg * (elite ? 1.4 : 1),
        xp: def.xp * (elite ? 3 : 1),
        cash: def.cash * (elite ? 3 : 1),
        def,
        elite,
        hitFlash: 0,
        slow: 0,
      });
    }

    function nearestEnemy(from) {
      let best = null;
      let bestD = 1e9;
      for (const e of state.enemies) {
        const d = dist(from, e);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      return best;
    }

    const WEAPON_STATS = {
      coins: { dmg: 9, r: 5, speed: 420, life: 1.15, pierce: 1, cd: 0.42 },
      briefcase: { dmg: 18, r: 7, speed: 470, life: 1.2, pierce: 1, cd: 0.62 },
      paper: { dmg: 7, r: 4, speed: 440, life: 1.0, pierce: 4, cd: 0.7, spray: 3 },
      bars: { dmg: 28, r: 8, speed: 430, life: 1.15, pierce: 1, cd: 0.85 },
      dynamite: { dmg: 34, r: 8, speed: 300, life: 0.95, pierce: 1, cd: 1.1, splash: 78 },
      crowbar: { dmg: 24, r: 13, speed: 560, life: 0.2, pierce: 8, cd: 0.48 },
      smoke: { cd: 2.4 },
    };

    function rollDamage(base) {
      const p = state.player;
      let dmg = base * p.damageMul;
      if (Math.random() < p.crit) dmg *= p.critMul;
      return dmg;
    }

    function shoot(weapon) {
      const p = state.player;
      if (weapon.id === "smoke") {
        state.zones.push({
          x: p.x,
          y: p.y,
          r: 70 + weapon.level * 12,
          life: 2.4,
          dmg: (8 + weapon.level * 3) * p.damageMul,
          slow: 0.45,
          color: "rgba(140,160,140,0.22)",
        });
        return;
      }
      const spec = WEAPON_STATS[weapon.id];
      if (!spec) return;
      const target = nearestEnemy(p);
      if (!target) return;
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      const spray = spec.spray || 1;
      const extras = p.projExtra + Math.max(0, weapon.level - 1);
      const count = spray + extras;
      const spreadStep = count > 1 ? 0.18 : 0;
      const start = -((count - 1) / 2) * spreadStep;
      for (let i = 0; i < count; i++) {
        const a = ang + start + i * spreadStep;
        const spd = (spec.speed + 20 * extras) * p.projSpeed;
        state.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          r: spec.r * p.projSize,
          dmg: rollDamage(spec.dmg + weapon.level * 2),
          life: spec.life,
          kind: weapon.id,
          pierce: spec.pierce + p.pierceBonus + Math.max(0, weapon.level - 1),
          splash: spec.splash ? spec.splash + weapon.level * 8 : 0,
          bounce: p.bounce,
          hit: new Set(),
        });
      }
    }

    function addWeapon(p, id) {
      const existing = p.weapons.find((w) => w.id === id);
      if (existing) {
        existing.level += 1;
        return;
      }
      p.weapons.push({ id, cd: 0, level: 1 });
    }

    const UPGRADES = [
      {
        id: "dmg",
        title: "Heavier haul",
        desc: "+25% weapon damage",
        apply: (p) => {
          p.damageMul *= 1.25;
        },
      },
      {
        id: "rate",
        title: "Faster hands",
        desc: "+20% fire rate",
        apply: (p) => {
          p.fireMul *= 1.2;
        },
      },
      {
        id: "spd",
        title: "Getaway shoes",
        desc: "+14% move speed",
        apply: (p) => {
          p.speed *= 1.14;
        },
      },
      {
        id: "hp",
        title: "Thick skin",
        desc: "+25 max HP and a heal",
        apply: (p) => {
          p.maxHp += 25;
          p.hp = Math.min(p.maxHp, p.hp + 40);
        },
      },
      {
        id: "magnet",
        title: "Greedy reach",
        desc: "+40 pickup range, faster gem pull",
        apply: (p) => {
          p.pickup += 40;
          p.gemPull += 80;
        },
      },
      {
        id: "multishot",
        title: "Loaded pockets",
        desc: "Fire +1 projectile from each weapon",
        apply: (p) => {
          p.projExtra += 1;
        },
      },
      {
        id: "pierce",
        title: "Through the badge",
        desc: "Shots pierce +1 extra cop",
        apply: (p) => {
          p.pierceBonus += 1;
        },
      },
      {
        id: "crit",
        title: "Lucky break",
        desc: "+12% crit chance",
        apply: (p) => {
          p.crit += 0.12;
        },
      },
      {
        id: "critdmg",
        title: "Big score",
        desc: "Crits deal +40% more",
        apply: (p) => {
          p.critMul += 0.4;
        },
      },
      {
        id: "armor",
        title: "Kevlar souvenir",
        desc: "Take 12% less contact damage",
        apply: (p) => {
          p.armor = Math.min(0.6, p.armor + 0.12);
        },
      },
      {
        id: "regen",
        title: "Stashed meds",
        desc: "Regenerate 2 HP per second",
        apply: (p) => {
          p.regen += 2;
        },
      },
      {
        id: "dodge",
        title: "Slippery suspect",
        desc: "+10% chance to dodge hits",
        apply: (p) => {
          p.dodge = Math.min(0.45, p.dodge + 0.1);
        },
      },
      {
        id: "thorns",
        title: "Barbed loot",
        desc: "Cops take damage when they touch you",
        apply: (p) => {
          p.thorns += 12;
        },
      },
      {
        id: "knock",
        title: "Shove off",
        desc: "Hits knock cops farther back",
        apply: (p) => {
          p.knockback += 55;
        },
      },
      {
        id: "bounce",
        title: "Rubber checks",
        desc: "Spent shots bounce to another cop",
        apply: (p) => {
          p.bounce += 1;
        },
      },
      {
        id: "size",
        title: "Fat stacks",
        desc: "+20% projectile size",
        apply: (p) => {
          p.projSize *= 1.2;
        },
      },
      {
        id: "vel",
        title: "Express mail",
        desc: "+18% projectile speed",
        apply: (p) => {
          p.projSpeed *= 1.18;
        },
      },
      {
        id: "xp",
        title: "Cooked books",
        desc: "+20% XP from gems",
        apply: (p) => {
          p.xpMul *= 1.2;
        },
      },
      {
        id: "cash",
        title: "Offshore account",
        desc: "+25% cash from downs",
        apply: (p) => {
          p.cashMul *= 1.25;
        },
      },
      {
        id: "aura",
        title: "Intimidating stare",
        desc: "Damage aura around you",
        apply: (p) => {
          p.auraR += 70;
          p.auraDmg += 8;
        },
      },
      {
        id: "orbit",
        title: "Getaway tires",
        desc: "Add a spinning tire that shreds cops",
        apply: (p) => {
          p.orbitCount += 1;
          p.orbitDmg += 4;
        },
      },
      {
        id: "orbitR",
        title: "Wider donut",
        desc: "Orbiting tires travel farther out",
        apply: (p) => {
          p.orbitR += 28;
          if (p.orbitCount < 1) p.orbitCount = 1;
        },
      },
      {
        id: "briefcase",
        title: "Stolen briefcase",
        desc: "Unlock / level a heavy thrown case",
        apply: (p) => addWeapon(p, "briefcase"),
      },
      {
        id: "paper",
        title: "Shredded 1040s",
        desc: "Unlock / level piercing paper spray",
        apply: (p) => addWeapon(p, "paper"),
      },
      {
        id: "bars",
        title: "Gold bars",
        desc: "Unlock / level chunky gold-bar shots",
        apply: (p) => addWeapon(p, "bars"),
      },
      {
        id: "dynamite",
        title: "Safe-cracker sticks",
        desc: "Unlock / level exploding dynamite",
        apply: (p) => addWeapon(p, "dynamite"),
      },
      {
        id: "crowbar",
        title: "Crowbar",
        desc: "Unlock / level a close-range sweep",
        apply: (p) => addWeapon(p, "crowbar"),
      },
      {
        id: "smoke",
        title: "Smoke bomb",
        desc: "Unlock / level a slowing smoke cloud",
        apply: (p) => addWeapon(p, "smoke"),
      },
      {
        id: "coins",
        title: "More loose change",
        desc: "Level up your starting coin toss",
        apply: (p) => addWeapon(p, "coins"),
      },
    ];

    function offerLevelUp() {
      paused = true;
      levelupEl.classList.remove("hidden");
      const pool = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
      choicesEl.innerHTML = "";
      for (const u of pool) {
        const b = document.createElement("button");
        b.className = "choice";
        b.innerHTML = `<h3>${u.title}</h3><p>${u.desc}</p>`;
        b.onclick = () => {
          u.apply(state.player);
          levelupEl.classList.add("hidden");
          paused = false;
          last = performance.now();
        };
        choicesEl.appendChild(b);
      }
    }

    function emit(x, y, color, n = 8) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(40, 160);
        state.particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: rand(0.25, 0.55),
          color,
          r: rand(2, 4),
        });
      }
    }

    function killEnemy(e, i) {
      if (i < 0) return;
      state.enemies.splice(i, 1);
      state.player.cash += (e.cash * state.player.cashMul) | 0;
      emit(e.x, e.y, e.def.color, 12);
      state.gems.push({
        x: e.x,
        y: e.y,
        xp: e.xp * state.player.xpMul,
        vx: rand(-30, 30),
        vy: rand(-30, 30),
      });
    }

    function damageEnemy(e, dmg, from) {
      e.hp -= dmg;
      e.hitFlash = 0.08;
      if (from) {
        const a = Math.atan2(e.y - from.y, e.x - from.x);
        const k = state.player.knockback * 0.09;
        e.x += Math.cos(a) * k;
        e.y += Math.sin(a) * k;
      }
      if (e.hp <= 0) {
        killEnemy(e, state.enemies.indexOf(e));
        return true;
      }
      return false;
    }

    function explode(x, y, r, dmg) {
      emit(x, y, "#e67e22", 18);
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (dist({ x, y }, e) <= r + e.r) damageEnemy(e, dmg, { x, y });
      }
    }

    function bounceBullet(b) {
      if (b.bounce <= 0) return false;
      let best = null;
      let bestD = 1e9;
      for (const e of state.enemies) {
        if (b.hit.has(e.uid)) continue;
        const d = dist(b, e);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) return false;
      b.bounce -= 1;
      b.pierce = 1;
      const a = Math.atan2(best.y - b.y, best.x - b.x);
      const spd = Math.hypot(b.vx, b.vy) || 400;
      b.vx = Math.cos(a) * spd;
      b.vy = Math.sin(a) * spd;
      b.life = Math.max(b.life, 0.45);
      return true;
    }

    function update(dt) {
      const p = state.player;
      state.t += dt;
      p.invuln = Math.max(0, p.invuln - dt);

      let mx = 0;
      let my = 0;
      if (keys.w || keys.arrowup) my -= 1;
      if (keys.s || keys.arrowdown) my += 1;
      if (keys.a || keys.arrowleft) mx -= 1;
      if (keys.d || keys.arrowright) mx += 1;
      const len = Math.hypot(mx, my) || 1;
      p.x = clamp(p.x + (mx / len) * p.speed * dt, 30, WORLD - 30);
      p.y = clamp(p.y + (my / len) * p.speed * dt, 30, WORLD - 30);

      state.cam.x = p.x - canvas.width / 2;
      state.cam.y = p.y - canvas.height / 2;

      state.spawnAcc += spawnRate(state.t) * dt;
      while (state.spawnAcc >= 1 && state.enemies.length < 90) {
        state.spawnAcc -= 1;
        spawnEnemy();
      }
      if (state.t > 90 && Math.random() < dt * 0.08 && state.enemies.length < 90) {
        spawnEnemy();
      }

      for (const w of p.weapons) {
        w.cd -= dt;
        const base =
          w.id === "coins" ? 0.42 : w.id === "paper" ? 0.7 : w.id === "bars" ? 0.85 : 0.62;
        if (w.cd <= 0) {
          shoot(w);
          w.cd = base / p.fireMul;
        }
      }

      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0) {
          state.bullets.splice(i, 1);
          continue;
        }
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (dist(b, e) < b.r + e.r) {
            e.hp -= b.dmg;
            e.hitFlash = 0.08;
            b.pierce -= 1;
            emit(b.x, b.y, "#f1c40f", 4);
            if (e.hp <= 0) killEnemy(e, j);
            if (b.pierce <= 0) {
              state.bullets.splice(i, 1);
              break;
            }
          }
        }
      }

      for (const e of state.enemies) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        if (p.invuln <= 0 && dist(p, e) < p.r + e.r - 2) {
          p.hp -= e.dmg;
          p.invuln = 0.55;
          emit(p.x, p.y, "#e74c3c", 10);
          if (p.hp <= 0) {
            p.hp = 0;
            gameOver();
            return;
          }
        }
      }

      for (let i = state.gems.length - 1; i >= 0; i--) {
        const g = state.gems[i];
        const d = dist(p, g);
        if (d < p.pickup + 10) {
          const pull = 280 * dt;
          g.x += ((p.x - g.x) / (d || 1)) * pull;
          g.y += ((p.y - g.y) / (d || 1)) * pull;
        } else {
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.vx *= 0.9;
          g.vy *= 0.9;
        }
        if (d < p.r + 8) {
          p.xp += g.xp;
          state.gems.splice(i, 1);
          while (p.xp >= xpNeeded(p.level)) {
            p.xp -= xpNeeded(p.level);
            p.level += 1;
            p.hp = Math.min(p.maxHp, p.hp + 15);
            offerLevelUp();
          }
        }
      }

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const q = state.particles[i];
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.life -= dt;
        if (q.life <= 0) state.particles.splice(i, 1);
      }

      hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
      xpBar.style.width = `${(p.xp / xpNeeded(p.level)) * 100}%`;
      const m = Math.floor(state.t / 60);
      const s = Math.floor(state.t % 60);
      timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
      lootEl.textContent = `Loot: $${p.cash | 0}`;
      levelEl.textContent = `Lv ${p.level}`;
    }

    function gameOver() {
      running = false;
      state.over = true;
      overEl.classList.remove("hidden");
      const p = state.player;
      const m = Math.floor(state.t / 60);
      const s = Math.floor(state.t % 60);
      overStats.textContent = `Survived ${m}:${String(s).padStart(2, "0")} · Loot $${p.cash | 0} · Level ${p.level}`;
    }

    function w2s(x, y) {
      return { x: x - state.cam.x, y: y - state.cam.y };
    }

    function drawRobber(x, y, flash) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "#3b2416";
      ctx.beginPath();
      ctx.ellipse(0, 16, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? "#fff" : "#2b211c";
      ctx.fillRect(-10, -2, 20, 16);
      ctx.fillStyle = "#c0392b";
      for (let i = 0; i < 4; i++) ctx.fillRect(-10 + i * 5, -2, 3, 16);
      ctx.fillStyle = "#e8d5b5";
      ctx.beginPath();
      ctx.arc(0, -10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillRect(-10, -14, 20, 7);
      ctx.fillRect(-7, -18, 14, 6);
      ctx.fillRect(-11, -12, 22, 4);
      ctx.fillStyle = "#111";
      ctx.fillRect(-8, -11, 16, 4);
      ctx.fillStyle = "#f1c40f";
      ctx.beginPath();
      ctx.moveTo(10, 4);
      ctx.lineTo(18, 0);
      ctx.lineTo(18, 12);
      ctx.lineTo(10, 10);
      ctx.fill();
      ctx.restore();
    }

    function drawCop(e, x, y) {
      const d = e.def;
      ctx.save();
      ctx.translate(x, y);
      const scale = e.r / 16;
      ctx.scale(scale, scale);
      ctx.fillStyle = e.hitFlash > 0 ? "#fff" : "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(0, 16, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = e.hitFlash > 0 ? "#fff" : d.color;
      ctx.fillRect(-11, -1, 22, 17);
      ctx.fillStyle = "#e8d5b5";
      ctx.beginPath();
      ctx.arc(0, -9, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.hat;
      ctx.fillRect(-10, -16, 20, 8);
      ctx.fillRect(-6, -20, 12, 5);
      if (d.id === "cop" || d.id === "sheriff") {
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(-2, -14, 4, 5);
      }
      if (d.id === "fbi" || d.id === "cia") {
        ctx.fillStyle = "#111";
        ctx.fillRect(-8, -10, 16, 3);
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;
        ctx.strokeRect(-9, 4, 7, 5);
      }
      if (d.id === "swat") {
        ctx.fillStyle = "#111";
        ctx.fillRect(-11, -8, 22, 5);
      }
      if (d.id === "irs") {
        ctx.fillStyle = "#f1c40f";
        ctx.font = "bold 8px sans-serif";
        ctx.fillText("$", -3, 10);
      }
      if (e.elite) {
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -22, 28, 40);
      }
      ctx.restore();
      ctx.fillStyle = "#f4f0e6";
      ctx.font = "11px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(e.elite ? `ELITE ${d.name}` : d.name, x, y - e.r - 10);
      const bw = 22;
      ctx.fillStyle = "#111";
      ctx.fillRect(x - bw / 2, y - e.r - 6, bw, 3);
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(x - bw / 2, y - e.r - 6, bw * clamp(e.hp / e.maxHp, 0, 1), 3);
    }

    function draw() {
      ctx.fillStyle = "#1a2030";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const origin = w2s(0, 0);
      ctx.save();
      ctx.translate(origin.x, origin.y);

      ctx.fillStyle = "#242b3a";
      ctx.fillRect(0, 0, WORLD, WORLD);

      ctx.strokeStyle = "rgba(241,196,15,0.08)";
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 16]);
      for (let x = 0; x < WORLD; x += 280) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD);
        ctx.stroke();
      }
      for (let y = 0; y < WORLD; y += 280) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const b of state.buildings) {
        ctx.fillStyle = `rgba(10,12,18,${b.shade + 0.35})`;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(241,196,15,0.08)";
        for (let wx = b.x + 12; wx < b.x + b.w - 10; wx += 22) {
          for (let wy = b.y + 12; wy < b.y + b.h - 10; wy += 22) {
            ctx.fillRect(wx, wy, 8, 8);
          }
        }
      }
      ctx.restore();

      for (const g of state.gems) {
        const s = w2s(g.x, g.y);
        ctx.fillStyle = "#f1c40f";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 6);
        ctx.lineTo(s.x + 5, s.y);
        ctx.lineTo(s.x, s.y + 6);
        ctx.lineTo(s.x - 5, s.y);
        ctx.fill();
      }

      for (const b of state.bullets) {
        const s = w2s(b.x, b.y);
        ctx.fillStyle =
          b.kind === "bars" ? "#f1c40f" : b.kind === "paper" ? "#ecf0f1" : b.kind === "briefcase" ? "#5d4037" : "#f39c12";
        ctx.beginPath();
        ctx.arc(s.x, s.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const e of state.enemies) {
        const s = w2s(e.x, e.y);
        if (s.x < -40 || s.y < -40 || s.x > canvas.width + 40 || s.y > canvas.height + 40) continue;
        drawCop(e, s.x, s.y);
      }

      const ps = w2s(state.player.x, state.player.y);
      if (state.player.invuln > 0 && Math.floor(state.t * 20) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }
      drawRobber(ps.x, ps.y, false);
      ctx.globalAlpha = 1;

      for (const q of state.particles) {
        const s = w2s(q.x, q.y);
        ctx.globalAlpha = clamp(q.life * 2, 0, 1);
        ctx.fillStyle = q.color;
        ctx.fillRect(s.x, s.y, q.r, q.r);
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(16, canvas.height - 86, 280, 70);
      ctx.fillStyle = "#f4f0e6";
      ctx.textAlign = "left";
      ctx.font = "13px Trebuchet MS";
      ctx.fillText("Wanted ladder", 26, canvas.height - 64);
      const pool = currentTiers(state.t);
      ctx.fillText(pool.map((t) => t.name).join("  ·  "), 26, canvas.height - 42);
      ctx.fillStyle = "#8d8a82";
      ctx.fillText("Stronger agencies join the chase over time", 26, canvas.height - 22);
    }

    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (!paused) {
        update(dt);
        draw();
      }
      requestAnimationFrame(loop);
    }

    function startGame() {
      reset();
      startEl.classList.add("hidden");
      overEl.classList.add("hidden");
      levelupEl.classList.add("hidden");
      running = true;
      paused = false;
      last = performance.now();
      requestAnimationFrame(loop);
    }

    document.getElementById("play").onclick = startGame;
    document.getElementById("retry").onclick = startGame;
  })();
