// Элементы
const avatar = document.getElementById('avatar');
const panel = document.getElementById('panel');
const stage = document.getElementById('stage');
const startBtn = document.getElementById('start-btn');
const toggleBtn = document.getElementById('toggle-panel');
const hideBtn = document.getElementById('hide-panel');

const volumeBar = document.getElementById('volume-meter-bar');
const slider = document.getElementById('threshold-slider');
const sliderLabel = document.getElementById('threshold-val');

// Хранилище URL картинок
let charImages = { 
    idle: '1.png', 
    blink: '2.png', 
    talk: '3.png', 
    talkBlink: '4.png' 
};

// Состояния анимации
let threshold = 25;
let smoothVol = 0;
let isBlinkingIdle = false;
let talkBlinkCounter = 0;
let isTalkBlinking = false;
let micStarted = false;

// --- УПРАВЛЕНИЕ ПАНЕЛЬЮ ---
hideBtn.onclick = () => {
    panel.classList.add('collapsed');
    toggleBtn.classList.add('visible');
    stage.style.marginRight = "0";
};

toggleBtn.onclick = () => {
    panel.classList.remove('collapsed');
    toggleBtn.classList.remove('visible');
    stage.style.marginRight = "350px";
};

// --- МИКРОФОН И ЧУВСТВИТЕЛЬНОСТЬ ---
slider.oninput = function() {
    threshold = parseInt(this.value);
    sliderLabel.innerText = this.value + "%";
};

startBtn.onclick = async () => {
    if (micStarted) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Активируем кнопку
        startBtn.classList.add('active');
        // Обновляем текст, сохраняя иконку
        startBtn.innerHTML = `<img src="icon.png" class="mic-icon"> <span>МИКРОФОН АКТИВЕН</span>`;
        
        document.getElementById('settings-group').classList.remove('hidden');
        
        initAudio(stream);
        idleBlinkLoop();
        micStarted = true;
    } catch (e) { 
        console.error(e);
        alert("Доступ к микрофону запрещен браузере!"); 
    }
};

// --- ФУНКЦИИ ЗАГРУЗКИ КАРТИНОК ---
function bindInput(id, key) {
    const input = document.getElementById(id);
    if (!input) return;
    input.onchange = function(e) {
        if (this.files && this.files[0]) {
            const r = new FileReader();
            r.onload = (ev) => { 
                charImages[key] = ev.target.result;
                // Сразу обновляем текущую картинку, если он в покое
                if (key === 'idle' && !avatar.classList.contains('talking') && !isBlinkingIdle) {
                    avatar.src = charImages.idle;
                }
            };
            r.readAsDataURL(this.files[0]);
        }
    };
}
bindInput('idle-input', 'idle');
bindInput('blink-input', 'blink');
bindInput('talk-input', 'talk');
bindInput('talk-blink-input', 'talkBlink');

// --- ЛОГИКА АНИМАЦИИ ГОВОРА ---
function initAudio(stream) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(stream);
    analyser.fftSize = 256;
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    function frame() {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for(let i=0; i<data.length; i++) sum += data[i];
        
        // Расчет громкости (0-100)
        let vol = (sum / data.length / 130) * 100;
        
        // Сглаживание
        smoothVol = smoothVol * 0.7 + vol * 0.3;
        volumeBar.style.width = Math.min(smoothVol, 100) + "%";

        if (smoothVol > threshold) {
            // СОСТОЯНИЕ: ГОВОРИТ
            avatar.classList.add('talking');
            
            talkBlinkCounter++;
            // Редкое моргание при разговоре
            if (talkBlinkCounter > 150) {
                isTalkBlinking = true;
                setTimeout(() => isTalkBlinking = false, 150);
                talkBlinkCounter = 0;
            }
            avatar.src = isTalkBlinking ? charImages.talkBlink : charImages.talk;
        } else {
            // СОСТОЯНИЕ: МОЛЧИТ
            avatar.classList.remove('talking');
            talkBlinkCounter = 0;
            if (!isBlinkingIdle) avatar.src = charImages.idle;
        }
        requestAnimationFrame(frame);
    }
    frame();
}

// --- ЦИКЛ МОРГАНИЯ В ПОКОЕ ---
function idleBlinkLoop() {
    setTimeout(() => {
        if (!avatar.classList.contains('talking')) {
            isBlinkingIdle = true;
            avatar.src = charImages.blink;
            setTimeout(() => {
                isBlinkingIdle = false;
                // Проверяем, не начал ли он говорить за время моргания
                if (!avatar.classList.contains('talking')) avatar.src = charImages.idle;
                idleBlinkLoop();
            }, 150);
        } else { 
            // Если говорит, просто пробуем снова через рандомное время
            idleBlinkLoop(); 
        }
    }, Math.random() * 5000 + 2000); // 2-7 секунд
}
// ... все старые переменные в начале остаются ...

let currentSlot = "1";
// Загружаем сохраненные данные или используем дефолтные
let savedData = JSON.parse(localStorage.getItem('pngtuber_slots')) || {
    "1": { idle: '1.png', blink: '2.png', talk: '3.png', talkBlink: '4.png' },
    "2": { idle: '1.png', blink: '2.png', talk: '3.png', talkBlink: '4.png' },
    "3": { idle: '1.png', blink: '2.png', talk: '3.png', talkBlink: '4.png' },
    "4": { idle: '1.png', blink: '2.png', talk: '3.png', talkBlink: '4.png' }
};

// Текущий активный набор картинок
charImages = savedData[currentSlot];

// --- ЛОГИКА СЛОТОВ ---
const slotBtns = document.querySelectorAll('.slot-btn');
const saveBtn = document.getElementById('save-slot-btn');

slotBtns.forEach(btn => {
    btn.onclick = () => {
        // Убираем активный класс у всех и даем нажатому
        slotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Меняем слот и загружаем картинки
        currentSlot = btn.dataset.slot;
        charImages = savedData[currentSlot];
        
        // Сразу обновляем аватара на сцене
        avatar.src = charImages.idle;
        console.log(`Слот ${currentSlot} загружен`);
    };
});

saveBtn.onclick = () => {
    // Сохраняем текущие картинки в объект и в localStorage
    savedData[currentSlot] = { ...charImages };
    localStorage.setItem('pngtuber_slots', JSON.stringify(savedData));
    
    saveBtn.innerText = "✅ Сохранено!";
    setTimeout(() => { saveBtn.innerText = "💾 Сохранить текущий"; }, 2000);
};

// Исправляем функции загрузки, чтобы они обновляли charImages
function bindInput(id, key) {
    const input = document.getElementById(id);
    input.onchange = function(e) {
        if (this.files[0]) {
            const r = new FileReader();
            r.onload = (ev) => { 
                charImages[key] = ev.target.result;
                if (key === 'idle') avatar.src = charImages.idle;
            };
            r.readAsDataURL(this.files[0]);
        }
    };
}
// Вызываем бинды как раньше...
bindInput('idle-input', 'idle');
bindInput('blink-input', 'blink');
bindInput('talk-input', 'talk');
bindInput('talk-blink-input', 'talkBlink');

// ... остальной код (initAudio, idleBlinkLoop) остается без изменений ...
