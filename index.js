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
  const sql = `SELECT COUNT(*), minTime, maxTime FROM data WHERE world = ? AND maxTime > ? AND sharedKey = ?`;
  db.get(sql, [world, minTime, sharedKey], function (err, row) {
	  if (err) {
		  console.error(err);
		  return;
	  }
	  if (row["COUNT(*)"] > 0)
    {
	  	console.log(`Already have this world: ${this.world}.`);
      let newMinTime = Math.max(row['minTime'], this.minTime)
      let newMaxTime = Math.min(row['maxTime'], this.maxTime)
      if (newMinTime <= newMaxTime)
      {
        const sql2 = `UPDATE data SET minTime = ?, maxTime = ? where world = ? and sharedKey = ?`
        db.run(sql2, [newMinTime, newMaxTime, this.world, this.sharedKey])
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
      console.log(`Skipping obj: ${loc}, ${world}, ${minTime}, ${maxTime}`);
      continue;
    }
    if (
      loc !== parseInt(loc, 10) ||
      world !== parseInt(world, 10) ||
      minTime !== parseInt(minTime, 10) ||
      maxTime !== parseInt(maxTime, 10)
    ) {
      console.log(`Skipping obj: ${loc}, ${world}, ${minTime}, ${maxTime}`);
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

  let sql = `SELECT * FROM data WHERE maxTime > ? AND sharedKey = ? ORDER BY minTime`;
  db.all(sql, [Math.floor(Date.now() / 1000)-180, key], (err, rows) => {
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
