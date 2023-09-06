import React from 'react';
import './App.css';

const STATUS = {
    STOP: 'STOP',
    START: 'START',
    PAUSE: 'PAUSE',
    OVER: 'OVER'
};

const JUMP_DELTA = 5;
const JUMP_MAX_HEIGHT = 53;
// The Game component is a React component because it extends the React.Component class
export default class Game extends React.Component {
    constructor(props) {
        super(props);

        let imageLoadCount = 0;
        let onImageLoaded = () => {
            ++imageLoadCount;
            if (imageLoadCount === 3) {
                this.__draw();
            }
        };
        
        // Load images
        
        let skyImage = new Image();
        let groundImage = new Image();
        let playerImage = new Image();
        let playerLeftImage = new Image();
        let playerRightImage = new Image();
        let playerDieImage = new Image();
        let obstacleImage = new Image();

        skyImage.onload = onImageLoaded;
        groundImage.onload = onImageLoaded;
        playerImage.onload = onImageLoaded;

        skyImage.src = require('./img/cloud.png');
        groundImage.src = require('./img/ground.png');
        playerImage.src = require('./img/dinosaur.png');
        playerLeftImage.src = require('./img/dinosaur_left.png');
        playerRightImage.src = require('./img/dinosaur_right.png');
        playerDieImage.src = require('./img/dinosaur_die.png');
        obstacleImage.src = require('./img/obstacle.png');

        this.state = {
            scores: [], // Dummy database array to store scores and finishing times
            showScores: false,
        };
        // Default options
        // You can change these options when you create a new Game instance
        this.options = {
            fps: 80,
            skySpeed: 40,
            groundSpeed: 130,
            skyImage: skyImage,
            groundImage: groundImage,
            playerImage: [playerImage, playerLeftImage, playerRightImage, playerDieImage],
            obstacleImage: obstacleImage,
            skyOffset: 0,
            groundOffset: 0,
            ...this.props.options
        };
        
        // Initialize the game status
        this.status = STATUS.STOP;
        this.timer = null;
        this.score = 0;
        this.highScore = window.localStorage ? window.localStorage['highScore'] || 0 : 0;
        this.jumpHeight = 0;
        this.jumpDelta = 0;
        this.obstaclesBase = 1;
        this.obstacles = this.__obstaclesGenerate();
        this.currentDistance = 0;
        this.playerStatus = 0;
    }

    componentDidMount() {
        if (window.innerWidth >= 680) {
            this.canvas.width = 680;
        }

        const onSpacePress = () => {
            switch (this.status) {
                case STATUS.STOP:
                    this.handleStartButtonClick(); // Start the game when space is pressed
                    break;
                case STATUS.START:
                    this.jump();
                    break;
                case STATUS.OVER:
                    this.handleRestartButtonClick(); // Restart the game when space is pressed
                    break;
            }
        };

        window.onkeypress = function (e) {
            if (e.key === ' ') {
                onSpacePress();
            }
        };
        this.canvas.parentNode.onclick = onSpacePress;

        window.onblur = this.pause;
        window.onfocus = this.goOn;
    }

    componentWillUnmount() {
        window.onblur = null;
        window.onfocus = null;
    }
    // The __draw() method is called every 1000 / this.options.fps milliseconds
    // to update the canvas
    
    __draw() {
        if (!this.canvas) {
            return;
        }

        const { options } = this;

        let level = Math.min(200, Math.floor(this.score / 100));
        let groundSpeed = (options.groundSpeed + level) / options.fps;
        let skySpeed = options.skySpeed / options.fps;
        let obstacleWidth = options.obstacleImage.width;
        let playerWidth = options.playerImage[0].width;
        let playerHeight = options.playerImage[0].height;

        const ctx = this.canvas.getContext('2d');
        const { width, height } = this.canvas;

        ctx.clearRect(0, 0, width, height);
        ctx.save();

        // Draw the sky
        // The sky is composed of two images moving to the left continuously
        // When the first image moves out of the canvas, draw it again behind the second image
        // When the second image moves out of the canvas, draw it again behind the first image
        this.options.skyOffset = this.options.skyOffset < width
            ? (this.options.skyOffset + skySpeed)
            : (this.options.skyOffset - width);
        ctx.translate(-this.options.skyOffset, 0);
        ctx.drawImage(this.options.skyImage, 0, 0);
        ctx.drawImage(this.options.skyImage, this.options.skyImage.width, 0);

     
        this.options.groundOffset = this.options.groundOffset < width
            ? (this.options.groundOffset + groundSpeed)
            : (this.options.groundOffset - width);
        ctx.translate(this.options.skyOffset - this.options.groundOffset, 0);
        ctx.drawImage(this.options.groundImage, 0, 76);
        ctx.drawImage(this.options.groundImage, this.options.groundImage.width, 76);

        // Draw the obstacles
        // The obstacles are composed of several images moving to the left continuously
        // When the first image moves out of the canvas, draw it again behind the second image
        
        ctx.translate(this.options.groundOffset, 0);
        ctx.drawImage(this.options.playerImage[this.playerStatus], 80, 64 - this.jumpHeight);
        
        this.jumpHeight = this.jumpHeight + this.jumpDelta;
        if (this.jumpHeight <= 1) {
            this.jumpHeight = 0;
            this.jumpDelta = 0;
        }
        else if (this.jumpHeight < JUMP_MAX_HEIGHT && this.jumpDelta > 0) {
            this.jumpDelta = (this.jumpHeight * this.jumpHeight) * 0.001033 - this.jumpHeight * 0.137 + 5;
        }
       
        else if (this.jumpHeight >= JUMP_MAX_HEIGHT) {
            this.jumpDelta = -JUMP_DELTA / 2.7;
        }

        // Draw the score
        // The score is the distance the player has run
        let scoreText = (this.status === STATUS.OVER ? 'GAME OVER  ' : '') + Math.floor(this.score);
        ctx.font = "Bold 18px Arial";
        ctx.textAlign = "right";
        ctx.fillStyle = "#595959";
        ctx.fillText(scoreText, width - 30, 23);
        
        if (this.status === STATUS.START) {
            this.score += 0.5;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                window.localStorage['highScore'] = this.score;
            }
            this.currentDistance += groundSpeed;
            if (this.score % 4 === 0) {
                this.playerStatus = (this.playerStatus + 1) % 3;
            }
        }
        if (this.highScore) {
            ctx.textAlign = "left";
            ctx.fillText('HIGH  ' + Math.floor(this.highScore), 30, 23);
        }

     

        let pop = 0;
        for (let i = 0; i < this.obstacles.length; ++i) {
            if (this.currentDistance >= this.obstacles[i].distance) {
                let offset = width - (this.currentDistance - this.obstacles[i].distance + groundSpeed);
                if (offset > 0) {
                    ctx.drawImage(options.obstacleImage, offset, 84);
                }
                else {
                    ++pop;
                }
            }
            else {
                break;
            }
        }
        for (let i = 0; i < pop; ++i) {
            this.obstacles.shift();
        }
        if (this.obstacles.length < 5) {
            this.obstacles = this.obstacles.concat(this.__obstaclesGenerate());
        }

        
        let firstOffset = width - (this.currentDistance - this.obstacles[0].distance + groundSpeed);
        if (90 - obstacleWidth < firstOffset
            && firstOffset < 60 + playerWidth
            && 64 - this.jumpHeight + playerHeight > 84) {
            this.stop();
        }

        ctx.restore();
    }

    __obstaclesGenerate() {
        let res = [];
        for (let i = 0; i < 10; ++i) {
            let random = Math.floor(Math.random() * 100) % 60;
            random = (Math.random() * 10 % 2 === 0 ? 1 : -1) * random;
            res.push({
                distance: random + this.obstaclesBase * 200
            });
            ++this.obstaclesBase;
        }
        return res;
    }

    __setTimer() {
        this.timer = setInterval(() => this.__draw(), 1000 / this.options.fps);
    }

    __clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    toggleScores = () => {
        this.setState(prevState => ({
            showScores: !prevState.showScores,
        }));
    };


    __clear() {
        this.score = 0;
        this.jumpHeight = 0;
        this.currentDistance = 0;
        this.obstacles = [];
        this.obstaclesBase = 1;
        this.playerStatus = 0;
    }

    start = () => {
        if (this.status !== STATUS.START) {
            this.status = STATUS.START;
            this.__setTimer();
            this.jump();
        }
    };
    handleStartButtonClick = () => {
        this.start();
    };


    pause = () => {
        if (this.status === STATUS.START) {
            this.status = STATUS.PAUSE;
            this.__clearTimer();
        }
    };

    goOn = () => {
        if (this.status === STATUS.PAUSE) {
            this.status = STATUS.START;
            this.__setTimer();
        }
    };

    stop = () => {
        if (this.status === STATUS.OVER) {
            return;
        }
        this.status = STATUS.OVER;
        this.playerStatus = 3;
        this.__clearTimer();
        this.__draw();
        // Save the score and finishing time to the dummy database array
        const finishingTime = new Date().toLocaleString();
        const scoreData = {
            score: Math.floor(this.score),
            finishingTime,
        };
        this.setState(prevState => ({
            scores: [...prevState.scores, scoreData],
        }));
        this.__clear();
    };

    restart = () => {
        this.obstacles = this.__obstaclesGenerate();
        this.status = STATUS.START;
        this.score = 0;
        this.highScore = window.localStorage ? window.localStorage['highScore'] || 0 : 0;
        this.jumpHeight = 0;
        this.jumpDelta = 0;
        this.currentDistance = 0;
        this.playerStatus = 0;
        this.setState({ showRestart: false }); // Hide the "Confirm Restart" button
        this.start();
    };
    handleRestartButtonClick = () => {
        this.setState({ showRestart: true }); // Show the "Confirm Restart" button
    };


    jump = () => {
        if (this.jumpHeight > 2) {
            return;
        }
        this.jumpDelta = JUMP_DELTA;
        this.jumpHeight = JUMP_DELTA;
    };
    // The render() method is called when the component is first mounted
    // and whenever the state changes
    
    render() {
        const { scores, showScores } = this.state;
        return (
            <div className="top-game-container">
                <div className='inner-game-container'>
                <canvas id="canvas" ref={ref => (this.canvas = ref)} height={160} width={340} />
                </div>
                <div className="game-instructions">
                    <button className="button" onClick={this.handleStartButtonClick}>
                        Start
                    </button>

                
                <button className="button" onClick={this.toggleScores}>
                    {showScores ? 'Hide Scores' : 'Show Scores'}
                </button>
                {showScores && (
                    <div className="scores-container">
                        <h2>Scores</h2>
                        <ul>
                            {scores.map((score, index) => (
                                <li key={index}>
                                    <span>{score.score}</span>
                                    <br />
                                    <span>{score.finishingTime}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    )}
                </div>
                
            </div>
        );
    }

};