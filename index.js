const express = require('express')
const sqlite3 = require('sqlite3')
const app = express()
const port = 3000

let db = new sqlite3.Database('./stardb.db', sqlite3.OPEN_READWRITE)

function updateDb(loc, world, minTime, maxTime) {
	// Check for worlds where world = this and maxTime is >
	// this means there can't be another star already
	let sql = `SELECT COUNT(*) FROM data WHERE world = ? AND maxTime > ?`
	db.get(sql, [world, minTime], function(err, row) {
		if (err) {
			console.error(err)
		}
		if (row['COUNT(*)'] > 0)
			console.log(`Already have this world: ${this.world}.`)
		else {
			console.log(`Adding row: ${this.loc}, ${this.world}, ${this.minTime}, ${this.maxTime}`)
			db.run(`INSERT INTO data(location, world, minTime, maxTime) VALUES(?, ?, ?, ?)`, [this.loc, this.world, this.minTime, this.maxTime], function(err) {
				if (err)
					console.log('Error')
			});

		}
	}.bind({loc: loc, world: world, minTime: minTime, maxTime: maxTime}))
}

app.use(express.json());
app.post('/post', (req, res) => {
	console.log(req.body)
	for (let i in req.body)
	{
		let datapoint = req.body[i]
		var loc = datapoint.loc
		var world = datapoint.world
		var minTime = datapoint.minTime
		var maxTime = datapoint.maxTime
		updateDb(loc, world, minTime, maxTime)

	}
	return res.send('Message received, thanks!')
})

app.get('/getStars', (req, res) => {
	let sql = `SELECT * FROM data where maxTime > ? ORDER BY minTime`
	db.all(sql, [Math.floor(Date.now()/1000)], (err, row) => {
		if (err) {
			console.log('get error')
			console.log(err)
			return res.status(500)
		}

		return res.send(row)

	});

});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})

