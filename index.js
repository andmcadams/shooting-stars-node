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

async function updateDb(key, loc, world, minTime, maxTime) {

  const sql = `SELECT COUNT(*) FROM data WHERE world = ? AND maxTime > ? AND sharedKey = ?`;
  try {
	const result = await db.get(sql, [world, minTime, key]);
	if (row["COUNT(*)"] > 0)
		console.log(`Already have this world: ${world}.`);
	else {
		console.log(
		`Adding row: ${loc}, ${world}, ${minTime}, ${maxTime}, ${sharedKey}`
		);
		const sql2 = `INSERT INTO data(location, world, minTime, maxTime, sharedKey) VALUES(?, ?, ?, ?, ?)`
		db.run(sql2, [loc, world, minTime, maxTime, sharedKey]);
	}
  } catch(err) {
	console.error(err);
  }
}

function validateSharedKey(sharedKey) {
	return /^[a-zA-Z0-9]+$/.test(sharedKey) && length(sharedKey) != 0;
}

app.use(express.json());
app.use(limiter);
app.post("/stars", async (req, res) => {
  console.log(req.body);
  console.log(req.headers.authorization);

  if (req.headers.authorization === undefined)
    return res.status(400).send({ error: "Missing Authorization header" });

  if (validateSharedKey(req.headers.authorization) == false)
	return res.status(400).send({ error: "Shared key in Authorization header must be alphanumberic" })

  // Keys should only be max 10 characters
  const key = req.headers.authorization.substring(0, 10);

  for (let i in req.body) {
    let datapoint = req.body[i];
    const { loc, world, minTime, maxTime } = req.body[i];
    await updateDb(key, loc, world, minTime, maxTime);
  }
  return res.send("Shooting star data received");
});

app.get("/stars", async (req, res) => {
	if (req.headers.authorization === undefined)
    return res.status(400).send({ error: "Missing Authorization header" });

  if (validateSharedKey(req.headers.authorization) == false)
	return res.status(400).send({ error: "Shared key in Authorization header must be alphanumberic" })

  // Keys should only be max 10 characters
  const key = req.headers.authorization.substring(0, 10);

  let sql = `SELECT * FROM data WHERE maxTime > ? AND sharedKey = ? ORDER BY minTime`;
  db.all(sql, [Math.floor(Date.now() / 1000), key], (err, rows) => {
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
