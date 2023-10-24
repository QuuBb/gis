import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import {fromLonLat, useGeographic} from 'ol/proj';
import OSM from 'ol/source/OSM';
import Overlay from 'ol/Overlay.js';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {Point, Polygon} from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';

const btnCenter = document.querySelector('.btn-center');
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const latEl = document.querySelector('.lat');
const longEl = document.querySelector('.long');
const btnSave = document.querySelector('.btn-save');
const pointNameInput = document.querySelector('.nameInput');

let latitude;
let longitude;
let latTmp;
let longTmp;
let map;
let view;
const userPoints = [];
const userRender = [];
const overlay = new Overlay({
    element: container,
    autoPan: {
        animation: {
            duration: 250,
        },
    },
});

function success(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
    console.log(longitude, latitude);
    view.setCenter([longitude, latitude]);
}

function error() {
    console.log("Can't load position");
    latitude = 54.37083;
    longitude = 18.613465;
    view.setCenter([longitude, latitude]);
}

function GetUserPosition() {
    if (!navigator.geolocation) {
        console.log('Geolocation is not supported by your browser');
    } else {
        navigator.geolocation.getCurrentPosition(success, error, {enableHighAccuracy: true});
    }
}

function RenderUserPosition() {
    map = new Map({
        overlays: [overlay],
        target: 'map',
        layers: [
            new TileLayer({
                source: new OSM(),
            }),
        ],
        view: (view = new View({
            center: [18.6, 54.4],
            zoom: 12,
        })),
    });
}

function Init() {
    useGeographic();
    RenderUserPosition();
}

function OnMapClick(event) {
    const coordinate = event.coordinate;
    latTmp = coordinate[0];
    longTmp = coordinate[1];
    pointNameInput.value = '';
    console.log(pointNameInput);
    latEl.innerHTML = `<p>X: ${coordinate[0].toPrecision(4)}</p>`;
    longEl.innerHTML = `<p>Y: ${coordinate[1].toPrecision(4)}</p>`;
    overlay.setPosition(coordinate);
    container.style.display = 'block';
}

function SaveUserPoint() {
    const pointName = pointNameInput.value;
    const point = new Feature({
        geometry: new Point([latTmp, longTmp]),
        name: pointName,
    });

    const iconStyle = new Style({
        image: new Icon({
            anchor: [0.5, 1],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            src: 'data/ebe.png',
        }),
    });

    point.setStyle(iconStyle);

    const vectorSource = new VectorSource({
        features: [point],
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
    });

    console.log(point);

    map.addLayer(vectorLayer);
}

Init();

map.on('singleclick', OnMapClick);
btnCenter.addEventListener('click', GetUserPosition);

closer.addEventListener('click', function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
});

btnSave.addEventListener('click', SaveUserPoint);
