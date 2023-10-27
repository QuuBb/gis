import data from './pointsData.json' assert {type: 'json'};
import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import {useGeographic} from 'ol/proj';
import {Feature, Overlay} from 'ol';
import {Point} from 'ol/geom';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import {add} from 'ol/coordinate';

const list = document.getElementsByTagName('ul')[0];
const popupInfo = document.getElementById('popupInfo');

const defLat = 54.4;
const defLong = 18.6;

class App {
    constructor() {
        useGeographic();

        this.view = new View({
            center: [defLong, defLat],
            zoom: 12,
        });

        this.map = new Map({
            target: 'map',
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            view: this.view,
        });

        this.points = [];
        this.pointRenders = [];
        this.pointLayer;

        this.LoadPoints();
        this.RenderPoints();
    }

    LoadDefaultPoints() {
        this.points.push(...data.monuments);
    }

    LoadSavedPoints() {
        if (localStorage.length == 0) return;
        for (let i = 0; i < localStorage.length; i++) {
            this.points.push(localStorage.getItem(localStorage.key(i)));
        }
        localStorage.clear();
    }

    LoadPoints() {
        this.LoadDefaultPoints();
        this.LoadSavedPoints();
    }

    RenderPointsToMap() {
        this.points.forEach(point => {
            let pointRender = new Feature({
                geometry: new Point([point.longitude, point.latitude]),
                name: point.name,
            });

            pointRender.setStyle(
                new Style({
                    image: new Icon({
                        scale: 0.7,
                        anchor: [0.5, 1],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        src: 'data/img.png',
                    }),
                })
            );

            this.pointRenders.push(pointRender);
        });

        this.vectorSource = new VectorSource({
            features: this.pointRenders,
        });

        this.vectorLayer = new VectorLayer({
            source: this.vectorSource,
        });

        this.map.addLayer(this.vectorLayer);
    }

    RenderPointToList() {
        this.points.forEach((point, i) => {
            list.insertAdjacentHTML(
                'beforeend',
                `<li class="border-b-2 border-black 80 flex items-center cursor-pointer">
                    <div class="w-full flex items-center p-1">
                    <div class="w-8 h-8">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="w-8 h-8 min-w-[32 rem]">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                    </div>
                    <h3 class="text-xl">${point.name}</h3>
                    </div>
                </li>`
            );

            list.lastElementChild.addEventListener('click', () => {
                this.ShowPointInfo(point);
                this.SetViewToPoint(point.longitude, point.latitude);
            });
        });
    }

    RenderPoints() {
        this.RenderPointToList();
        this.RenderPointsToMap();
    }

    SetViewToPoint(long, lat) {
        const cords = [long, lat];
        add(cords, [10, 15]);
        this.view.setCenter(cords);
        this.view.setZoom(18);
    }

    ShowPointInfo(point) {
        const x = this.map.getOverlays().getArray()[0];
        if (x !== undefined) this.map.removeOverlay(x);
        console.log(this.map);
        console.log(x);
        this.map.removeOverlay(0);
        const overlay = new Overlay({
            element: popupInfo,
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
            positioning: 'bottom-center',
            offset: [0, -60],
        });

        this.map.addOverlay(overlay);

        console.log('ebe');

        overlay.setPosition([point.longitude, point.latitude]);

        popupInfo.getElementsByTagName('img')[0].src = point.photo;
        popupInfo.getElementsByTagName('h4')[0].innerHTML = point.name;
        popupInfo.getElementsByTagName('p')[2].innerHTML = point.description;

        popupInfo.classList.remove('hidden');
    }
}

const app = new App();
console.log(app);
