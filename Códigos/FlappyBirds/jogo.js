const sprites = new Image(); //cria uma nova imagem 
sprites.src="./sprites.png"  //indica o endereço da base da nova imagem criada

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d'); //indica que a renderização é 2d 
const global = {}; //variavel que guardará o blueprint dos objetos renderizados em tela e toda a vez que precisar renderizar um novo apenas será necessário o comando new
var frames = 0; //frames totais do jogo em funcionamento

var records = [];

if(localStorage.getItem('records')){
    let memory = localStorage.getItem('records');
    memory = memory.replace('[', '');
    memory = memory.replace(']', '');
    records = memory.split(',')

    let memoryRecords = []

    for(var i = 0; i <= 2; i++){
        memoryRecords.push(parseInt(records[i]));
    }

    records = memoryRecords;
    records.sort((a,b) => b - a);

}else{
    records = [0];
}

const hitSound = new Audio();
hitSound.src = "./efeitos/hit.wav"; // inserção de som 

const jumpSound = new Audio();
jumpSound.src = "./efeitos/pulo.wav";

const pointSound = new Audio();
pointSound.src = "./efeitos/ponto.wav";


function Colision(flappyBird, floor){
    const flappyBirdY = flappyBird.y + flappyBird.h;
    const floorY = floor.y;

    if(flappyBirdY >= floorY){
        return true;
    }

    return false;
}

function createPipe(){
    const pipe = {
        wid: 52,
        h: 400,
        floorPipe: {
            spriteX: 0,
            spriteY: 169
        },
        skyPipe: {
            spriteX: 52,
            spriteY: 169
        },
        space: 80,
        drawIt(){
            pipe.pairPipe.forEach(function(pair){
                const randomY = pair.y // inicio de onde será desenhado o cano de cima e número negativo já que para que haja mudança de altura precisará ter uma rng mudando o inicio de cada cano superior
                const spaceBetween = 90; //espaço entre os canos

                const skyPipeX = pair.x; //igual ao skyPipeX uma vez que a posição no eixo x precisa ser identica em ambos
                const skyPipeY = randomY; //o y gerado aleatoriamente precisará ser o inicio do desenho do pipe do céu


                context.drawImage( //comando para desenhar o sprite na tela
                    sprites,
                    pipe.skyPipe.spriteX, pipe.skyPipe.spriteY,
                    pipe.wid, pipe.h,
                    skyPipeX, skyPipeY,
                    pipe.wid, pipe.h
                )

                const floorPipeX = pair.x; //igual ao skyPipeX uma vez que a posição no eixo x precisa ser identica em ambos
                const floorPipeY = pipe.h + spaceBetween + randomY; //o pipe do chão precisará ser desenhado em uma altura que seja abaixo da altura completa do pipe somado a altura somado a brecha que deseja inserir entre os canos e junto a isso somar o y do pipe do céu garantirá que ele começará a soma do mesmo y do pipe do ceu

                context.drawImage(
                    sprites,
                    pipe.floorPipe.spriteX, pipe.floorPipe.spriteY,
                    pipe.wid, pipe.h,
                    floorPipeX, floorPipeY,
                    pipe.wid, pipe.h
                )

                pair.upPipe = {
                    x: skyPipeX,
                    y: skyPipeY + pipe.h //marca onde o pipe do ceu cobre ou seja de sua raiz até sua ponta (identificada pela altura total da figura)
                }

                pair.downPipe = {
                    x: floorPipeX,
                    y: floorPipeY 
                }
            });
        },
        pairPipe:[],
        colisionFlappyBird(pair){
            const upSideFlappyBird = global.flappyBird.y; //determina a cabeça do flappybird (ou seja pixel que ele começa a ser desenhado)
            const downSideFlappyBird = global.flappyBird.y + global.flappyBird.h; //determina onde fica o pé do flappybird (ou seja pixel que ele começa a ser desenhado somado a sua altura)

            if((global.flappyBird.x + (global.flappyBird.wid - 5)) >= pair.x){
                if(upSideFlappyBird <= pair.upPipe.y || downSideFlappyBird >= pair.downPipe.y){
                    return true;
                }else if((global.flappyBird.x - 8) > (pair.x + pipe.wid)){
                    return global.score.refreshIt();
                }

                //caso quaisquer das proposições for satisfeita retornará true, ou seja, tocou em um cano com o pé ou com a cabeça
            }
        },
        refreshIt(){
            const hundredFrames = frames % 100 == 0; //a cada 100 frames algo ocorre, demarcado pelo operador % uma vez que quando chegar a 100 frames e for dividido por 100 o retorno será zero

            if(hundredFrames){ //a cada 100 frames um pipe novo é desenhado em cima e outro em baixo
                pipe.pairPipe.push({
                    x: canvas.width, //começara a ser desenhado no final do canvas
                    y: -150 * (Math.random() + 1) //determinará o fator aleatorio da altura que retornará sempre um valor negativo dando assim as diferenças de altura entre cada par de pipes
                });
            }

            pipe.pairPipe.forEach(function(pair){
                pair.x -= 2; //movimenta o par de pipes

                if(pipe.colisionFlappyBird(pair)){

                    hitSound.play(); //executa o som

                    records.push(global.score.scorePoints);
                    records.sort((a,b) => b -a);
                    if(records.length > 3)records.pop();
                    changeScreen(Screen.GAME_OVER);
                }                

                if(pair.x + pipe.wid <= 0){ //sempre que a posição horizontal do pipe somado a sua largura for 0 então ele ja esta fora da tela e é excluido do objeto pairPipe
                    pipe.pairPipe.shift();
                }
            });
        }
    }

    return pipe;
}

function createFlappyBird(){
    const flappyBird = {
        spriteX: 0,
        spriteY: 0,
        wid: 33,
        h: 24,
        x: 10,
        y: 50,
        gravity: 0.2,
        velocity: 0,
        jump: 3.8,
        refreshCurrentFrame(){
            const framesInterval = 10
            const interval = frames % framesInterval == 0

            if(interval){

                const baseAddition = 1;
                const addition = baseAddition + flappyBird.currentFrame; //é o modificador baseado na taxa de alteração e o frame atual dentro do objeto flappybird
                const baseRepetition = flappyBird.animationSprite.length; //numero de animações diferentes do flappybird batendo asas

                flappyBird.currentFrame = addition % baseRepetition; //o resto da divisão entre o somatório do frame atual do objeto com sua taxa de aumento, e o numero de movimentos diferentes que o flappybird possui é o frame atual dentro do objeto
            }
        },
        animationSprite: [
            {spriteX: 0, spriteY: 0},
            {spriteX: 0, spriteY: 26},
            {spriteX: 0, spriteY:52},
            {spriteX: 0, spriteY: 26}
        ],
        currentFrame: 0,
        refreshIt(){
            if(Colision(flappyBird, global.floor)){
                hitSound.play();
                records.push(global.score.scorePoints);
                records.sort((a,b) => b -a);
                if(records.length > 3)records.pop();
                changeScreen(Screen.GAME_OVER);
                return;
            }
    
            flappyBird.velocity = flappyBird.velocity + flappyBird.gravity; //aumenta gradativamente a velocidade do flappybird durante a queda
            flappyBird.y += flappyBird.velocity; //efetiva o efeito da gravidade no y do sprite do flappybird
        },
        jumpIt(){
            jumpSound.play();
            flappyBird.valocity = -1;
            flappyBird.velocity = - flappyBird.jump; // um subito aumento de y cria o efeito de pulo
    
        },
        drawIt(){
            this.refreshCurrentFrame();
            const { spriteX, spriteY } = flappyBird.animationSprite[flappyBird.currentFrame];

            context.drawImage(
                sprites, //source de imagem
                spriteX, spriteY,    //distancia do ponto 0x e 0y
                flappyBird.wid, flappyBird.h,   // o tamanho do sprite selecionado 
                flappyBird.x, flappyBird.y,  //local onde o sprite estará localizado no canvas
                flappyBird.wid, flappyBird.h    //tamanho do sprite dentro do canvas
            );
        }
    
    }

    return flappyBird;
}

function createFloor(){
    const floor = {
        spriteX: 0,
        spriteY: 610,
        wid: 224,
        h: 112,
        x: 0,
        y: canvas.height - 112,
        drawIt(){
            context.drawImage(
                sprites,
                floor.spriteX,floor.spriteY,
                floor.wid,floor.h,
                floor.x,floor.y,
                floor.wid,floor.h
            );
    
            context.drawImage(
                sprites,
                floor.spriteX, floor.spriteY,
                floor.wid, floor.h,
                (floor.x + floor.wid), floor.y,
                floor.wid, floor.h
            );
        },
        refreshIt(){
            const floorMoviment = 1; //taxa padrão de movimento do chão
            const repeatOn = floor.wid / 2; //define quando o chão precisará repetir
            const moving = floor.x - floorMoviment; //cria o efeito de movimentação do chão

            floor.x = moving % repeatOn; //a posição horizontal do chão é dada pelo resto da divisão da subtração do x atual e da taxa padrão de movimento dividido pela metada da largura do chão
        }
    }
    
    return floor;
}

const gameOver = {
    spriteX: 134,
    spriteY: 153,
    wid: 226,
    h: 199,
    x: (canvas.width / 2) - 226 / 2,
    y: 50,
    drawIt(){
        context.drawImage(
            sprites,
            gameOver.spriteX, gameOver.spriteY,
            gameOver.wid, gameOver.h,
            gameOver.x, gameOver.y,
            gameOver.wid, gameOver.h
        );
    }
}

function createScore(){
    const score = {
        scorePoints:0,
        drawIt(){
            context.font = '35px "VT323"';
            context.textAlign = 'right';
            context.fillStyle = 'white';
            context.fillText(score.scorePoints, canvas.width - 15,35);
        },
        refreshIt(){
            score.scorePoints += 1;
            pointSound.play();
        }
    }
    return score;
}

const backGround = {
    spriteX: 390,
    spriteY: 0,
    wid: 275,
    h: 204,
    x: 0,
    y: canvas.height - 204,
    drawIt(){
        context.fillStyle = '#70c5ce';
        context.fillRect(0,0, canvas.width, canvas.height)

        context.drawImage(
            sprites,
            backGround.spriteX, backGround.spriteY,
            backGround.wid, backGround.h,
            backGround.x, backGround.y,
            backGround.wid, backGround.h
        );

        context.drawImage(
            sprites,
            backGround.spriteX, backGround.spriteY,
            backGround.wid, backGround.h,
            (backGround.x + backGround.wid), backGround.y,
            backGround.wid, backGround.h
        );
    }
}

const getReady = {
    spriteX: 134,
    spriteY: 0,
    wid: 174,
    h: 152,
    x: (canvas.width / 2) - 174 / 2,
    y: 50,
    drawIt(){
        context.drawImage(
            sprites,
            getReady.spriteX, getReady.spriteY,
            getReady.wid, getReady.h,
            getReady.x, getReady.y,
            getReady.wid, getReady.h
        );
    }
}

const medal = {
    wid: 44,
    h: 44,
    x: 74,
    y: 137,
    gold: {
        spriteX: 0,
        spriteY: 124,
    },
    silver: {
        spriteX: 48,
        spriteY: 78
    },
    bronze: {
        spriteX: 48,
        spriteY: 124
    },
    noMedal: {
        spriteX: 0,
        spriteY: 78
    },
    drawIt(){
        let i = this.whichMedal();
            
        var SpriteX = 0
        var SpriteY = 0;

        switch (i){
            case 0:
                SpriteX = medal.gold.spriteX;
                SpriteY = medal.gold.spriteY;
             break;

            case 1:
                SpriteX = medal.silver.spriteX;
                SpriteY = medal.silver.spriteY;
            break;
                
            case 2:
                SpriteX = medal.bronze.spriteX;
                SpriteY = medal.bronze.spriteY;
            break;

            default:
                SpriteX = medal.noMedal.spriteX;
                SpriteY = medal.noMedal.spriteY;
            break;
        }

        context.drawImage(
            sprites,
            SpriteX, SpriteY,
            medal.wid, medal.h,
            medal.x, medal.y,
            medal.wid, medal.h
        );  
    },
    whichMedal(){
        for(var i = 0; i <= records.length; i++){
            if(records[i] <= global.score.scorePoints){
                return i;
            }
        }
    },
    getFinalScore(){
        context.font = '23px VT323';
        context.fillStyle = 'brown';
        context.fillText(global.score.scorePoints, 238, 143); 
    },
    getBestScore(){
        context.font = '23px VT323';
        context.fillStyle = 'brown';
        context.fillText(records[0], 238, 185)
    },
    insertIntoLocalStorage(){
        localStorage.setItem('records', JSON.stringify(records))
    }
}    

let activeScreen = {};//objeto declarado que receberá a tela ativa no momento
function changeScreen(nScreen){
    activeScreen = nScreen; //a nova tela ativa é a passada pelo parametro da função

    if(activeScreen.init){ //caso a função init exista dentro do objeto da tela ativa no momento, o if será lido
        activeScreen.init(); 
    }
}

const Screen = {

    BEGIN: {
        init(){
            global.flappyBird = createFlappyBird();
            global.floor = createFloor();
            global.pipe = createPipe();
            //cria os objetos(flappybird, cano e chão) e os aninha no objeto global
        },
        drawIt(){
            backGround.drawIt();
            global.flappyBird.drawIt();
            global.floor.drawIt();
            //desenha o background, canos e flappybird já aninhados em global

            getReady.drawIt(); //inicia o menu do jogo
        },

        refreshIt(){
            global.floor.refreshIt(); //cria movimentação no chão
        },

        click(){
            changeScreen(Screen.GAME); //quando clickar a tela ativa será a tela de jogo
        }
    },

    GAME: {

        init(){
            global.score = createScore();
        },

        drawIt(){
            backGround.drawIt();
            global.pipe.drawIt();
            global.floor.drawIt();
            global.flappyBird.drawIt();
            global.score.drawIt();
            //desenha todos os itens da tela (flappybird, chão, canos e background) dinamicamente
        },

        click(){
            global.flappyBird.jumpIt(); //ao clickar o comando pulo é ativado
        },

        refreshIt(){
            global.pipe.refreshIt();
            global.flappyBird.refreshIt();
            global.floor.refreshIt();
            //gera movimentação do flappybird, criação de novos canos dinamicamente e movimentação do chão
        }
    },

    GAME_OVER: {

        init(){
            medal.insertIntoLocalStorage();
        },

        drawIt(){
            gameOver.drawIt();
            medal.drawIt();
            medal.getBestScore();
            medal.getFinalScore();
        },

        refreshIt(){


        },

        click(){
            changeScreen(Screen.BEGIN);
        }
    }
}

function loop(){
   activeScreen.drawIt(); //desenha a tela marcada na função desenho da tela ativa
   activeScreen.refreshIt(); //aciona a função atualiza da tela ativa

    frames += 1;
    requestAnimationFrame(loop); //requisita a atualização da animação em tela gerando o movimento e é feito um callback da função para que esteja sempre sendo atualizada a posição, gerando movimento
}

window.addEventListener('click', function(){
    if(activeScreen.click){//adiciona o evento click na tela ativa (para iniciar ou pular)
        activeScreen.click();
    }
});

changeScreen(Screen.BEGIN); //por padrão o jogo iniciará da tela inicial
loop(); //chama a função que fará a animação do jogo correr