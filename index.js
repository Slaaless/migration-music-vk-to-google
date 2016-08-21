'use strict';

const https = require('https');
const net = require('net');
const url = require('url');
const pm = new (require('playmusic'));
const argv = require('minimist')(process.argv.slice(2));
const progress = require('progress');
const colors = require('colors');

let notTracks = '';
let notArtist = '';
let countSuccess = 0;
let bar;

let token = argv.token;
let user_id = argv.user_id;
let email = argv.email;
let password = argv.password;
let playListName = argv.name_list;
// console.log(argv.token);
// d7f9f14b2bf7a69ff1682f704571a8ba6813163b48425dcb907a119d39a223ee10a962f4f319dbe01a394
// 19811600

if (!token) {
    throw Error('Не указан токен от VK.')
}

if (!user_id) {
    throw Error('Не указан user_id от VK.')
}

if (!email) {
    throw Error('Не указана почта от google.')
}

if (!password) {
    throw Error('Не указан пароль от google.')
}

if (!playListName) {
    throw Error('Не указано имя плейлиста.')
}

let options = 'https://api.vk.com/method/audio.get?count=0&owner_id=' + user_id + '&access_token=' + token;
let body = [], result = [];
https.get(options, (request) => {
    request
        .on('data', function(chunk) {
            body.push(chunk);
        })
        .on('end', function() {
            body = JSON.parse(Buffer.concat(body).toString()).response;

            for (let i = 1; i < body.length; i++) {
                result.push(body[i].artist + ' - ' + body[i].title);
            }

            let countTracks = result.length;
            let currentTrack = 0;
            let barOptions = {
                total: countTracks,
                width: 35
            };
            bar = new progress('Migration [:bar] :percent :etas', barOptions);

            pm.init({email: email, password: password}, (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                let playListId;
                pm.addPlayList(playListName, (err, body) => {
                    playListId = body.mutate_response[0].id;
                    let addTrack = (numb) => {
                        bar.tick();
                        currentTrack++;
                        if (numb >= countTracks || undefined == numb) {
                            console.log(colors.magenta('========================'));
                            console.log(colors.magenta('     Процесс завершен   '));
                            console.log(colors.magenta('========================'));
                            console.log('\n');
                            console.log(colors.magenta('Удачно перенеслось: ' + countSuccess + '/' + countTracks));
                            console.log('\n');
                            console.log(colors.magenta('------- Список песен, которые не нашлись, но есть исполнитель -------'));
                            console.log(notTracks);
                            console.log('\n');
                            console.log(colors.magenta('------- Список песен, которые не нашлись и нет исполнителя -------'));
                            console.log(notArtist);
                            return;
                        }

                        pm.search(result[numb], 1, (err, data) => {
                            if (data.entries) {
                                for (let i = 0; i < data.entries.length; i++) {
                                    if (data.entries[i].hasOwnProperty('track')) {
                                        let trackId = data.entries[i].track.nid;
                                        pm.addTrackToPlayList(trackId, playListId, (err, data) => {
                                            if (err) console.log(err);
                                            countSuccess++;
                                            addTrack(currentTrack);
                                        });
                                        return;
                                    }
                                }

                                notTracks += result[numb] + '\n';
                                addTrack(currentTrack);
                            } else {
                                notArtist += result[numb] + '\n';
                                addTrack(currentTrack);
                            }
                        });
                    }
                    addTrack(currentTrack);

                });
            });
        });
});
