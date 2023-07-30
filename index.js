const express = require('express');
const { writeFile } = require('fs');
const app = express()

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

function writeToFile(path, value, index) {
    writeFile(path, value, 'latin1', err => {
        if(err) console.log(err);
    })
}

function getBoundary(header) {
    const boundary = header.split(";")[1].trim().slice(13)

    return boundary
}

function breakBufferLine(buffer) {
    const string = buffer.toString('latin1')

    const array = string.split("\n")

    return array
}

function parseBoundaryIndexes(bufferStringArray, boundary) {
    const indexes = []

    bufferStringArray.forEach((bufferString, index) => {
        if(bufferString.match(new RegExp(boundary))) {
            indexes.push(index)
        }
    })

    return indexes
}

function getFileName(newArray) {
    const fileNamesInfo = []
    const regex = /filename=(.*)/
    
    for(let i = 0; i < newArray.length; i++) {
        const element = newArray[i];

        for(let j = 0; j < element.length; j++) {
            const string = element[j]

            const filenameMatcher = string.match(new RegExp(regex))

            if(filenameMatcher) fileNamesInfo.push(filenameMatcher)
        }
    }

    const fileNames = fileNamesInfo.map(infoArray => infoArray[1].slice(1, infoArray[1].length - 1))

    return fileNames
}

function removeHeader(splitFiles) {
    return splitFiles.map(splitFile => splitFile.slice(4))
}

function unbreakBufferLine(parsedFiles) {
    return parsedFiles.map(parsedFile => parsedFile.join("\n"))
}

function splitFiles(bufferStringArray, indexes) {
    const newArray = []
    
    indexes.reduce((prev, value) => {
        newArray.push(bufferStringArray.slice(prev, value))
        
        return Math.max(prev, value)
    })

    const fileNames = getFileName(newArray)

    const files = []

    const parsedFiles = removeHeader(newArray)

    const finalFiles = unbreakBufferLine(parsedFiles)

    for(let i = 0; i < newArray.length; ++i) {
        files.push({
            name: fileNames[i],
            file: finalFiles[i]
        })
    }

    return files
}

function saveFiles(binaryFiles) {
    binaryFiles.forEach(file => {
        writeToFile(`./files/${file.name}`, file.file)
    })
}

app.post('/upload', (req, res) => {
    // get content disposition header
    const header = req.headers["content-type"]

    // get webkit boundary
    const boundary = getBoundary(header)
    
    const chunks = []

    req.on('data', chunk => {
        chunks.push(chunk)
    })

    req.on('end', () => {
        const buffer = Buffer.concat(chunks)

        // split the buffer by \n
        const bufferStringArray = breakBufferLine(buffer)

        // get indexes of all occurences of webkit boundary
        const indexes = parseBoundaryIndexes(bufferStringArray, boundary)

        // use indexes to split the buffer by files
        const binaryFiles = splitFiles(bufferStringArray, indexes)

        // save files
        saveFiles(binaryFiles)
    })
})

app.listen(3000, () => {
    console.log(`http://localhost:3000`);
})