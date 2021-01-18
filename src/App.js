import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import * as tfjs from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import {Howl} from 'howler';
import { initNotifications, notify } from '@mycv/f8-notification';
import soundURL from './assets/hey_sondn.mp3';
import { randomUniform } from '@tensorflow/tfjs';

var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = "not_touch"
const TOUCHED_LABEL = "touched"
const TRAINING_TIMES = 50
const TOUCHED_CONFIDENCE = 0.8


function App() { 
  const [touched, setTouched] = useState(false)
  const video = useRef()
  const canPlaySound = useRef(true)
  const classifier = useRef()
  const mobilenetModule = useRef()

  const init = async () => {
    console.log('init...')
    await setupCamera();
    console.log('set up camera success');

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log('set up done')
    console.log('khong cham tay len mat va bam Train 1')
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) =>{
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozgetUserMedia ||
      navigator.msGetUserMedia

      if(navigator.getUserMedia) {  
        navigator.getUserMedia(
          { video: true},
          stream => {
            video.current.srcObject = stream
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      }
      else {
        reject()
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] Dang train cho may mat cua ban... `)
    for (let i = 0; i <TRAINING_TIMES; i++) {
      console.log(`progress ${parseInt((i+1) / TRAINING_TIMES * 100)}% `);
      await training(label)
    }
  }

/**
 * Buoc 1: Train cho may khuon mat khong cham tay
 * Buoc 2: Train cho may khuon mat co cham tay
 * Buoc 3: Lay hinh anh hien tai, phan tich va so sanh voi data da hoc truoc do
 * ==> Neu ma matching voi data khuon mat cham tay ==> Canh bao
 * @param {*} label
 */
  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      )
      classifier.current.addExample(embedding,label)
      await sleep(100)
      resolve()
    })
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    )
    const result = await classifier.current.predictClass(embedding)
    
    if(result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
      ) {
        console.log('Touched')
        if (canPlaySound.current) {
          canPlaySound.current =false
          sound.play();
        }

        notify('Bo tay ra', { body: 'Ban vua cham tay vao mat!!!' });
        setTouched(true)

        initNotifications({ cooldown: 3000 })
      }
    else {
        console.log('No Touch')
        setTouched(false)
      }

    await sleep(200)

    run()
  }

  const sleep = (ms = 0) => {
    return  new Promise(resolve => setTimeout(resolve, ms))
  }
  useEffect(() => {
    init();

    sound.on('end', function(){
      canPlaySound.current = true
    });

    //clean up
    return () => {

    }
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <h1>HELLO</h1>
      <video
      ref={video}
        className="video"
        autoPlay
      />

      <div className="control">
        <button  className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button  className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button  className="btn" onClick={() => run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
