const express = require("express");
const sqlite3 = require("sqlite3");
const rateLimit = require("express-rate-limit");
const app = express();
const port = 3000;

const db = new sqlite3.Database("./stardb.db", sqlite3.OPEN_READWRITE);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

function updateDb(sharedKey, loc, world, minTime, maxTime) {
  const sql = `SELECT ROWID as rowid, minTime, maxTime FROM data WHERE world = ? AND maxTime > ? AND sharedKey = ? ORDER BY ROWID DESC`;
  db.get(sql, [world, minTime-600, sharedKey], function (err, row) {
	  if (err) {
		  console.error(err);
		  return;
	  }
	  if (row !== undefined)
    {
	  	console.log(`Already have this world: ${this.world}.`);
      let newMinTime = Math.max(row['minTime'], this.minTime)
      let newMaxTime = Math.min(row['maxTime'], this.maxTime)
      if (newMinTime <= newMaxTime)
      {
        const sql2 = `UPDATE data SET minTime = ?, maxTime = ? where ROWID = ?`
        console.log(`Updating time to ${newMinTime} - ${newMaxTime}, ${row['rowid']}`)
        db.run(sql2, [newMinTime, newMaxTime, row['rowid']])
      }
      else
        console.error(`newMin > newMax, ignoring for ${this.world}: ${this.key}`);
	  }
    else {
		  console.log(
			  `Adding row: ${this.loc}, ${this.world}, ${this.minTime}, ${this.maxTime}, ${this.sharedKey}`
		  );
		  const sql2 = `INSERT INTO data(location, world, minTime, maxTime, sharedKey) VALUES(?, ?, ?, ?, ?)`;
		  db.run(sql2, [this.loc, this.world, this.minTime, this.maxTime, this.sharedKey], (err) => {
			  if (err)
			  	console.log(err)
		  });
	  }
  }.bind({sharedKey, loc, world, minTime, maxTime}));
}

function validateSharedKey(sharedKey) {
  return /^[a-zA-Z]+$/.test(sharedKey) && sharedKey.length != 0;
}

app.use(express.json());
app.use(limiter);
app.post("/stars", async (req, res) => {
  if (req.headers.authorization === undefined)
    return res.status(400).send({ error: "Missing Authorization header" });

  if (validateSharedKey(req.headers.authorization) == false)
    return res.status(400).send({
      error: "Shared key in Authorization header must be alpha only",
    });

  // Keys should only be max 10 characters
  const key = req.headers.authorization.substring(0, 10);

  if (!Array.isArray(req.body))
    return res.status(400).send({ error: "Body needs to be an array" });

  for (let i in req.body) {
    const { loc, world, minTime, maxTime } = req.body[i];
    // There's probably a lib for this
    if (
      loc === undefined ||
      world === undefined ||
      minTime === undefined ||
      maxTime === undefined
    ) {
      console.log(`Skipping obj (undefined issue): ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }
    if (
      loc !== parseInt(loc, 10) ||
      world !== parseInt(world, 10) ||
      minTime !== parseInt(minTime, 10) ||
      maxTime !== parseInt(maxTime, 10)
    ) {
      console.log(`Skipping obj (non int issue): ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }

    if (maxTime - minTime < 60*2 || maxTime - minTime > 60*26 || world > 535 || world < 301) {
      console.log(`Skipping obj (time or world issue): ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }
    if (loc > 13 || loc < 0) {
      console.log(`Skipping obj (loc issue): ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }
    if (maxTime - Math.floor(Date.now() / 1000) > 9660 || minTime > maxTime) {
      console.log(`Skipping obj (too late or flipped time issue): ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }

    updateDb(key, loc, world, minTime, maxTime);
  }
  return res.send("Shooting star data received");
});

app.get("/stars", (req, res) => {
  if (req.headers.authorization === undefined)
    return res.status(400).send({ error: "Missing Authorization header" });

  if (validateSharedKey(req.headers.authorization) == false)
    return res.status(400).send({
      error: "Shared key in Authorization header must be alpha only",
    });

  // Keys should only be max 10 characters
  const key = req.headers.authorization.substring(0, 10);

  let sql = `SELECT * FROM data WHERE maxTime > ? AND maxTime < ? AND sharedKey = ? ORDER BY maxTime`;
  db.all(sql, [Math.floor(Date.now() / 1000)-300, Math.floor(Date.now() / 1000)+(60*140), key], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500);
    }

    return res.send(rows);
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
