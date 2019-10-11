const fsPromises = require('fs').promises;
const electron = require('electron');
const { shell } = electron;
const remote = electron.remote;
const storage = require('electron-json-storage');
const path = require('path');


window.onload = function () {
    /** ウィンドウの幅 */
    const windowWidth = 345;
    /** ウィンドウの高さ */
    const windowHeight = 189;

    /** 設定 */
    let preferences = {
        isStop: false,
        isMute: false,
        animeDelay: 6400,
        waterSoundVolume: 100,
        sukohnSoundVolume: 100,
        position: 4
    };
    /** ボタンで右下や左上に移動した場合に、ボタンで移動したことが分かるようにこの変数に代入しておく。 */
    let positionTmp = 0;
    /** 移動した場合インクリメントする。 */
    let moveCnt = 0;

    /** 設定の保存時のエラー画面を表示するか。 */
    let saveErrorIsDisplay = true;

    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let waterBuffer;
    let waterGain = audioCtx.createGain();
    let waterSource;
    let sukohnBuffer;
    let sukohnGain = audioCtx.createGain();
    let sukohnSource;
    const waterFile = path.join(__dirname, 'audio', 'water.mp3');
    const sukohnFile = path.join(__dirname, 'audio', 'sukohn.mp3');

    /** アニメーションのタイムアウト */
    let animeTimeouts;
    /** 竹が動き出してか石に当たるまでのディレイ */
    const animeDuration = 1600;
    const animeIntervalMin = 0;
    const animeIntervalMax = 3600;
    /** 鹿威しのアニメーションのクラス名 */
    const shishiodoshiAnime = 'shishiodoshi-anime';
    /** 水のアニメーションのクラス名 */
    const waterAnime = 'water-anime';

    /** コントローラを非表示にするクラス名 */
    const controllerHidden = 'controller-hidden';
    /** エラー画面やローディング画面を非表示にするクラス名 */
    const displayNone = 'display-none';
    
    /** 使用する各要素 */
    let controllers = {
        'app-controller': document.getElementById('app-controller'),
        'sukohn-sound-controller': document.getElementById('sukohn-sound-controller'),
        'water-sound-controller': document.getElementById('water-sound-controller'),
        'sukohn-interval-controller': document.getElementById('sukohn-interval-controller'),
        'drag-controller': document.getElementById('drag-controller'),
        'about-controller': document.getElementById('about-controller')
    };
    let haveControllerPartsList = document.getElementsByClassName('have-controller');
    let shishiodoshiTakedutu = document.getElementById('shishiodoshi-takedutu');
    let waterDrop = document.getElementById('water-drop');
    let sukohnSoundVolumeRange = document.getElementById('sukohn-sound-volume-range');
    let sukohnSoundVolume = document.getElementById('sukohn-sound-volume');
    let waterSoundVolumeRange = document.getElementById('water-sound-volume-range');
    let waterSoundVolume = document.getElementById('water-sound-volume');
    let sukohnIntervalText = document.getElementById('sukohn-interval-text');
    let sukohnIntervalAttention = document.getElementById('sukohn-interval-attention');
    let mute = document.getElementById('mute');
    let hsMuteAttention = document.getElementById('hs-mute-attention');
    let wsMuteAttention = document.getElementById('ws-mute-attention');
    let stop = document.getElementById('stop');
    let hsStopAttention = document.getElementById('hs-stop-attention');
    let wsStopAttention = document.getElementById('ws-stop-attention');
    let hiStopAttention = document.getElementById('hi-stop-attention');
    let exit = document.getElementById('exit');
    let about = document.getElementById('about');
    let reboot = document.getElementById('reboot');
    let closeControllerBtns = document.getElementsByClassName('controller-close-btn');
    let loading = document.getElementById('loading');
    let error = document.getElementById('error');
    let errorAttention = document.getElementById('error-attention');
    let errorMsg = document.getElementById('error-msg');
    let errorDetails = document.getElementById('error-details');
    let errorRetry = document.getElementById('error-retry');
    let errorReboot = document.getElementById('error-reboot');
    let errorSkip = document.getElementById('error-skip');
    let loadingErrorCloseBtn = document.getElementById('loading-error-close-btn');
    let saveError = document.getElementById('save-error');
    let saveErrorMsg = document.getElementById('save-error-msg');
    let saveErrorNoDisplay = document.getElementById('save-error-no-display');
    let saveErrorDetails = document.getElementById('save-error-details');
    let saveErrorRetry = document.getElementById('save-error-retry');
    let saveErrorClose = document.getElementById('save-error-close');
    let saveErrorCloseBtn = document.getElementById('save-error-close-btn');
    let dragLeftTop = document.getElementById('drag-left-top');
    let dragRightTop = document.getElementById('drag-right-top');
    let dragLeftBottom = document.getElementById('drag-left-bottom');
    let dragRightBottom = document.getElementById('drag-right-bottom');
    let links = document.getElementsByClassName('link');

    const muteAttentionMsg = '無音になっています';
    const stopAttentionMsg = '停止しています';

    waterGain.connect(audioCtx.destination);
    sukohnGain.connect(audioCtx.destination);

    shishiodoshiTakedutu.addEventListener('animationend', () => {
        shishiodoshiTakedutu.classList.remove(shishiodoshiAnime);
        waterDrop.classList.remove(waterAnime);
        setAnime();
    });

    /*
     * controllerNamesにあるコントローラを持つ要素をクリックしたときに、そのコントローラを表示する。
     * 他のコントローラは非表示にする。表示されていた場合は非表示にする。
     */
    for (let haveControllerParts of haveControllerPartsList) {
        haveControllerParts.addEventListener('click', () => {
            let controller = controllers[haveControllerParts.dataset.have];
            if (controller.classList.contains(controllerHidden)) {
                for (let controllerName in controllers) {
                    controllers[controllerName].classList.add(controllerHidden);
                }
                controller.classList.remove(controllerHidden);
            } else {
                controller.classList.add(controllerHidden);
            }
        });
    }

    /*
     * コントロールボックスのクローズボタンを押したときその親の要素を非表示にする。
     */
    for (let closeControllerBtn of closeControllerBtns) {
        closeControllerBtn.addEventListener('click', () => {
            if (closeControllerBtn.dataset.parent) {
                controllers[closeControllerBtn.dataset.parent].classList.add(controllerHidden);
            }
        });
    }

    for (let link of links) {
        link.addEventListener('click', () => {
            shell.openExternal(link.dataset.url);
        });
    }

    sukohnSoundVolumeRange.addEventListener('change', () => {
        sukohnSoundVolume.textContent = sukohnSoundVolumeRange.value;
        preferences.sukohnSoundVolume = Number(sukohnSoundVolumeRange.value);
        if (!preferences.isMute) {
            sukohnGain.gain.value = Number(sukohnSoundVolumeRange.value) / 100;
        }
        save();
    });

    waterSoundVolumeRange.addEventListener('change', () => {
        waterSoundVolume.textContent = waterSoundVolumeRange.value;
        preferences.waterSoundVolume = Number(waterSoundVolumeRange.value);
        if (!preferences.isMute) {
            waterGain.gain.value = Number(waterSoundVolumeRange.value) / 100;
        }
        save();
    });

    sukohnIntervalText.addEventListener('input', () => {
        let value = Number(sukohnIntervalText.value);
        if (isNaN(value) || animeIntervalMin > value || animeIntervalMax < value) {
            sukohnIntervalAttention.textContent = animeIntervalMin + ' ~ ' + animeIntervalMax;
        } else {
            sukohnIntervalAttention.textContent = '';
            preferences.animeDelay = value * 1000;
            if (!shishiodoshiTakedutu.classList.contains(shishiodoshiAnime)) {
                clearAnime();
                setAnime();
            }
            save();
        }
    });

    mute.addEventListener('click', () => {
        preferences.isMute = !preferences.isMute;
        if (preferences.isMute) {
            waterGain.gain.value = 0;
            sukohnGain.gain.value = 0;
            mute.textContent = '解除';
            hsMuteAttention.textContent = muteAttentionMsg;
            wsMuteAttention.textContent = muteAttentionMsg;
        } else {
            waterGain.gain.value = Number(waterSoundVolumeRange.value) / 100;
            sukohnGain.gain.value = Number(sukohnSoundVolumeRange.value) / 100;
            mute.textContent = '無音';
            hsMuteAttention.textContent = '';
            wsMuteAttention.textContent = '';
        }
        save();
    });

    stop.addEventListener('click', () => {
        preferences.isStop = !preferences.isStop;
        if (preferences.isStop) {
            stopAnime();
            clearAnime();
            if (waterSource) {
                waterSource.stop();
            }
            if (sukohnSource) {
                sukohnSource.stop();
            }
            hsStopAttention.textContent = stopAttentionMsg;
            wsStopAttention.textContent = stopAttentionMsg;
            hiStopAttention.textContent = stopAttentionMsg;
            stop.textContent = '解除';
        } else {
            waterSource = playSound(waterBuffer, waterGain, true);
            setAnime();
            hsStopAttention.textContent = '';
            wsStopAttention.textContent = '';
            hiStopAttention.textContent = '';
            stop.textContent = '停止';
        }
        save();
    });

    exit.addEventListener('click', () => {
        remote.getCurrentWindow().close();
    });

    about.addEventListener('click', () => {
        for (let controllerName in controllers) {
            controllers[controllerName].classList.add(controllerHidden);
        }
        controllers['about-controller'].classList.remove(controllerHidden);
    });

    reboot.addEventListener('click', () => {
        remote.getCurrentWindow().removeAllListeners('move');
        remote.getCurrentWindow().reload();
    });

    errorDetails.addEventListener('click', () => {
        if (errorMsg.classList.contains(displayNone)) {
            errorMsg.classList.remove(displayNone);
            errorDetails.textContent = '非表示';
        } else {
            errorMsg.classList.add(displayNone);
            errorDetails.textContent = '詳細';
        }
    });

    errorReboot.addEventListener('click', () => {
        remote.getCurrentWindow().reload();
    });

    saveErrorNoDisplay.addEventListener('click', () => {
        saveErrorIsDisplay = false;
    });

    saveErrorDetails.addEventListener('click', () => {
        if (saveErrorMsg.classList.contains(displayNone)) {
            saveErrorMsg.classList.remove(displayNone);
            saveErrorDetails.textContent = '非表示';
        } else {
            saveErrorMsg.classList.add(displayNone);
            saveErrorDetails.textContent = '詳細';
        }
    });

    saveErrorRetry.addEventListener('click', () => {
        saveError.classList.add(displayNone);
        save();
    });

    saveErrorClose.addEventListener('click', () => {
        saveError.classList.add(displayNone);
    });

    saveErrorCloseBtn.addEventListener('click', () => {
        saveError.classList.add(displayNone);
    });

    dragLeftTop.addEventListener('click', () => {
        positionTmp = 1;
        remote.getCurrentWindow().setBounds(corner(false, false));
    });
    dragRightTop.addEventListener('click', () => {
        positionTmp = 2;
        remote.getCurrentWindow().setBounds(corner(true, false));
    });
    dragLeftBottom.addEventListener('click', () => {
        positionTmp = 3;
        remote.getCurrentWindow().setBounds(corner(false, true));
    });
    dragRightBottom.addEventListener('click', () => {
        positionTmp = 4;
        remote.getCurrentWindow().setBounds(corner(true, true));
    });
    /**
     * ウィンドウを移動した時に呼び出される。
     * ボタンで左上や右下に移動した場合に（なぜかわからないが）２度呼び出され、２度目の呼び出しでpositionTmpが0でpreferences.positionに1~4が設定されず次回の起動時に位置が数pxずれるため、positionTmpが0の場合は何もしない。
     * preferences.positionに、positionTmpが1~4の場合はpositionTmpを代入する。1~4でなければウィンドウの位置を取得し代入する。
     * 500ms後に、設定を保存する関数を実行する。moveCntが呼び出された時点の数値と異なっていれば、呼び出された時点からさらに動いていると判断し、保存しない。異なっていなければmoveCntをリセットし、設定を保存する。
     */
    remote.getCurrentWindow().on('move', () => {
        if (positionTmp == 0) {
            positionTmp = -1;
            return;
        }
        let currentMoveCnt = ++moveCnt;
        if (positionTmp >= 1 && positionTmp <= 4) {
            preferences.position = positionTmp;
            positionTmp = 0;
        } else {
            bounds = remote.getCurrentWindow().getBounds();
            preferences.position = {
                x: bounds.x,
                y: bounds.y
            };
        }
        window.setTimeout(() => {
            if (currentMoveCnt != moveCnt) {
                return;
            }
            moveCnt = 0;
            save();
        }, 500);
    });

    load();

    /**
     * 指定した音声を再生し、そのソースを返す。
     * @param {Object} buffer 音声のバッファ
     * @param {Object} gain 音声のゲイン
     * @param {Boolean} loop ループするならtrue
     * @return {Object} 音声のソース
     */
    function playSound(buffer, gain, loop = false) {
        let source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);
        source.loop = loop;
        source.start();
        return source;
    }
    
    /**
     * 停止されていない場合にアニメーションをタイムアウトにセットする。
     */
    function setAnime() {
        animeTimeouts = [];
        if (!preferences.isStop) {
            animeTimeouts.push(window.setTimeout(() => {
                shishiodoshiTakedutu.classList.add(shishiodoshiAnime);
            }, preferences.animeDelay));
            animeTimeouts.push(window.setTimeout(() => {
                waterDrop.classList.add(waterAnime);
            }, preferences.animeDelay));
            animeTimeouts.push(window.setTimeout(() => {
                sukohnSource = playSound(sukohnBuffer, sukohnGain, false);
            }, preferences.animeDelay + animeDuration - 50));
        }
    }

    /**
     * アニメーションのクラスを削除してアニメーションをストップする。
     */
    function stopAnime() {
        if (shishiodoshiTakedutu.classList.contains(shishiodoshiAnime)) {
            shishiodoshiTakedutu.classList.remove(shishiodoshiAnime);
            waterDrop.classList.remove(waterAnime);
        }
    }

    /**
     * アニメーションのタイムアウトをすべてクリアする。
     */
    function clearAnime() {
        for (animeTimeout of animeTimeouts) {
            window.clearTimeout(animeTimeout);
        }   
    }
    
    /**
     * 画面の角に配置する場合のx,yをオブジェクトで返す。
     * @param {Boolean} right 画面右に密着するならtrue
     * @param {Boolean} bottom 画面下に密着するならtrue
     * @return {Object} x,yを持つオブジェクト
     */
    function corner (right, bottom) {
        let cornerPosition = {x: 0, y: 0};
        const { width, height } = remote.screen.getPrimaryDisplay().workAreaSize;
        if (right) {
            cornerPosition.x = width - windowWidth;
        }
        if (bottom) {
            cornerPosition.y = height - windowHeight;
        }
        return cornerPosition;
    }

    /**
     * 水の音声ファイルを読み込む。
     */
    function readWaterSound () {
        fsPromises.readFile(waterFile)
        .then(data => audioCtx.decodeAudioData(data.buffer))
        .then((buffer) => {
            waterBuffer = buffer;
            readSukohnSound();
        })
        .catch((err) => {
            displayError('水の音声ファイルの読み込みに失敗しました。', err, readWaterSound, readSukohnSound);
        });
    }

    /**
     * 鹿威しの音声ファイルを読み込む。
     */
    function readSukohnSound () {
        fsPromises.readFile(sukohnFile)
        .then(data => audioCtx.decodeAudioData(data.buffer))
        .then(buffer => {
            sukohnBuffer = buffer;
            loadingEnd();
        })
        .catch((err) => {
            displayError('鹿威しの音声ファイルの読み込みに失敗しました。', err, readSukohnSound, loadingEnd);
        });
    }

    /**
     * 設定ファイルを読み込み初期化する。
     */
    function load () {
        getStorage('preferences')
        .then(data => {
            if (data.hasOwnProperty('isStop') && typeof data.isStop === 'boolean') {
                preferences.isStop = data.isStop;
            }
            if (data.hasOwnProperty('isMute') && typeof data.isMute === 'boolean') {
                preferences.isMute = data.isMute;
            }
            if (data.hasOwnProperty('animeDelay') && typeof data.animeDelay === 'number') {
                preferences.animeDelay = data.animeDelay;
            }
            if (data.hasOwnProperty('waterSoundVolume') && typeof data.waterSoundVolume === 'number') {
                preferences.waterSoundVolume = data.waterSoundVolume;
            }
            if (data.hasOwnProperty('sukohnSoundVolume') && typeof data.sukohnSoundVolume === 'number') {
                preferences.sukohnSoundVolume = data.sukohnSoundVolume;
            }
            if (data.hasOwnProperty('position')) {
                positionTmp = data.position;
                if (data.position == 1) {
                    remote.getCurrentWindow().setBounds(corner(false, false));
                } else if (data.position == 2) {
                    remote.getCurrentWindow().setBounds(corner(true, false));
                } else if (data.position == 3) {
                    remote.getCurrentWindow().setBounds(corner(false, true));
                } else if (typeof data.position === 'object' && data.position.hasOwnProperty('x') && data.position.hasOwnProperty('y') && typeof data.position.x === 'number' && typeof data.position.y === 'number') {
                    positionTmp = -1;
                    remote.getCurrentWindow().setBounds({x: data.position.x, y: data.position.y}); 
                } else {
                    preferences.position = 4;
                    positionTmp = -1;
                }
            }
            
            stop.textContent = preferences.isStop ? '解除' : '停止';
            wsStopAttention.textContent = preferences.isStop ? stopAttentionMsg : '';
            hsStopAttention.textContent = preferences.isStop ? stopAttentionMsg : '';
            hiStopAttention.textContent = preferences.isStop ? stopAttentionMsg : '';
            mute.textContent = preferences.isMute ? '解除' : '無音';
            wsMuteAttention.textContent = preferences.isMute ? muteAttentionMsg : '';
            hsMuteAttention.textContent = preferences.isMute ? muteAttentionMsg : '';
            sukohnIntervalText.value = preferences.animeDelay / 1000;
            waterSoundVolume.textContent = preferences.waterSoundVolume;
            waterSoundVolumeRange.value = preferences.waterSoundVolume;
            waterGain.gain.value = preferences.isMute ? 0 : preferences.waterSoundVolume / 100;
            sukohnSoundVolume.textContent = preferences.sukohnSoundVolume;
            sukohnSoundVolumeRange.value = preferences.sukohnSoundVolume;
            sukohnGain.gain.value = preferences.isMute ? 0 : preferences.sukohnSoundVolume / 100;
            
            readWaterSound();
        })
        .catch(err => {
            displayError('設定の読み込みに失敗しました。', err, load, readWaterSound);
        });
    }

    /**
     * 設定を保存する。
     */
    function save () {
        setStorage('preferences', preferences)
        .then(() => {})
        .catch(err => {
            if (saveErrorIsDisplay) {
                saveErrorMsg.textContent = err;
                saveError.classList.remove(displayNone);
            }
        });
    }

    /**
     * 起動時のファイル等のロード時のエラーを表示する。
     * @param {String} errorAttentionText エラーの内容
     * @param {String} errorMsgText エラーの詳細
     * @param {Function} errorRetryFunc リトライボタンを押したとき実行する関数
     * @param {Function} errorSkipFunc スキップボタンを押したとき実行する関数
     */
    function displayError (errorAttentionText, errorMsgText, errorRetryFunc, errorSkipFunc) {
        loading.classList.add(displayNone);
        errorAttention.textContent = errorAttentionText;
        errorMsg.textContent = errorMsgText;
        errorRetry.onclick = () => {
            error.classList.add(displayNone);
            loading.classList.remove(displayNone);
            errorRetryFunc();
        };
        errorSkip.onclick = () => {
            error.classList.add(displayNone);
            loading.classList.remove(displayNone);
            errorSkipFunc();
        }
        loadingErrorCloseBtn.onclick = () => {
            error.classList.add(displayNone);
            loading.classList.remove(displayNone);
            errorSkipFunc();
        }
        error.classList.remove(displayNone);
    }

    /**
     * 起動時のファイル等のロードが終わった後に呼び出される。鹿威しの始動をする。
     */
    function loadingEnd () {
        loading.classList.add(displayNone);
        if (!preferences.isStop) {
            waterSource = playSound(waterBuffer, waterGain, true);
        }
        setAnime();
    }
}

/**
 * データを取得する
 * @param {String} fileName 取得するファイルの名前
 * @return {Object} プロミス
 */
function getStorage (fileName) {
    return new Promise((resolve, reject) => {
        storage.get(fileName, function (error, data) {
            if (error) reject(error);
    
            resolve(data);
        })
    });
}

/**
 * データを保存する
 * @param {String} fileName 保存するファイルの名前
 * @param {Object} json 保存するオブジェクト
 * @return {Object} プロミス
 */
function setStorage (fileName, json) {
    return new Promise((resolve, reject) => {
        storage.set(fileName, json, function (error) {
            if (error) reject(error);

            resolve();
        });
    });
}