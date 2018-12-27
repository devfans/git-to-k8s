'use strict'

const express = require('express')

const app = express()
app.get('/', (req, res) => res.json({ err_no: 0, message: 'working well' }));

app.listen(3000)
