const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Video = require('./models/Video');
const ioClient = require('socket.io-client');
const socket = ioClient('http://localhost:3001'); // Conectar a la app de visualización

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb+srv://Tuterror:Tuterror@utube.huzcvtj.mongodb.net/?retryWrites=true&w=majority&appName=utube', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let recommendedVideos = [];

app.get('/', async (req, res) => {
    const videoDir = path.join(__dirname, 'public', 'videos');
    fs.readdir(videoDir, async (err, files) => {
        if (err) {
            return res.status(500).send('Error reading video directory');
        }
        const videos = files.filter(file => file.endsWith('.mp4'));
        const videoRecords = await Video.find({}).exec();
        res.render('index', { videos, videoRecords, recommendedVideos });
    });
});

app.get('/video/:name', async (req, res) => {
    const videoName = req.params.name;
    const predefinedCategories = {
        'BAD BOYS 4-Tráiler.mp4': ['accion', 'armas'],
        'DAWA.mp4': ['educacion', 'tecsup'],
        'INGLES.mp4': ['tecsup', 'lengua'],
        'IntensaMente 2-Tráiler Oficial.mp4': ['emociones', 'animacion'],
        'SpiderMan-Trailer.mp4': ['ficcion', 'accion'],
        'TECSUP.mp4': ['tecsup', 'tecnologia'],
        'Terrifier Official Trailer.mp4': ['armas', 'terror'],
        'TRANSFORMERS 7-EL DESPERTAR DE LAS BESTIAS-Tráiler.mp4': ['ficcion', 'armas'],
    };

    let video = await Video.findOne({ name: videoName }).exec();
    if (!video) {
        video = new Video({ 
            name: videoName, 
            categories: predefinedCategories[videoName] || [] 
        });
        await video.save();
    }
    res.render('video', { videoName, videoId: video._id, videoCategories: video.categories });
});

app.post('/video/:id/viewTime', async (req, res) => {
    const videoId = req.params.id;
    const { viewTime } = req.body;
    const video = await Video.findByIdAndUpdate(videoId, { viewTime }, { new: true }).exec();

    // Emitir evento de actualización de datos
    socket.emit('updateData', video);

    // Si el tiempo de visualización es mayor o igual a 10 segundos, actualizar las recomendaciones
    if (viewTime >= 10) {
        recommendedVideos = await Video.find({
            _id: { $ne: videoId }, // Excluir el video actual
            categories: { $in: video.categories }
        }).exec();
        socket.emit('updateRecommendations', recommendedVideos);
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
