import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Draggable from 'react-draggable';
import Model from './Model';
import AnimationControls from './AnimationControls';
import './App.css';
import playImage from './assets/cssIcons/playButton.png';
import pauseImage from './assets/cssIcons/pauseButton.png';
import loopActiveImage from './assets/cssIcons/loopActive.png';
import loopInactiveImage from './assets/cssIcons/loopInactive.png';

const App = () => {
    const [exportTrigger, setExportTrigger] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [animationControl, setAnimationControl] = useState('pause');
    const [loop, setLoop] = useState(false);
    const [finalPosition, setFinalPosition] = useState([0, 0, 0]);
    const [finalScale, setFinalScale] = useState([1, 1, 1]);
    const [finalRotation, setFinalRotation] = useState([0, 0, 0]);
    const [duration, setDuration] = useState(5);
    const [availableAnimations, setAvailableAnimations] = useState([]);
    const [selectedAnimations, setSelectedAnimations] = useState([]);
    const [playKeyframeAnimation, setPlayKeyframeAnimation] = useState(false);

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            setImportFile(file);
        }
    };

    const togglePlayPause = () => {
        setAnimationControl(prev => (prev === 'play' ? 'pause' : 'play'));
    };

    const handlePositionChange = (e, index) => {
        const newPos = [...finalPosition];
        newPos[index] = parseFloat(e.target.value);
        setFinalPosition(newPos);
    };

    const handleScaleChange = (e, index) => {
        const newScale = [...finalScale];
        newScale[index] = parseFloat(e.target.value);
        setFinalScale(newScale);
    };

    const handleRotationChange = (e, index) => {
        const newRot = [...finalRotation];
        newRot[index] = parseFloat(e.target.value);
        setFinalRotation(newRot);
    };

    const handleDurationChange = (e) => {
        setDuration(parseFloat(e.target.value));
    };

    const handleAnimationSelect = (animationName) => {
        setSelectedAnimations(prev => {
            if (prev.includes(animationName)) {
                return prev.filter(name => name !== animationName);
            } else {
                return [...prev, animationName];
            }
        });
    };

    useEffect(() => {
        if (importFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const contents = e.target.result;
                const loader = new GLTFLoader();
                loader.parse(contents, '', function (gltf) {
                    const animations = gltf.animations.map(animation => animation.name);
                    setAvailableAnimations(animations);
                    setSelectedAnimations(animations);
                });
            };
            reader.readAsArrayBuffer(importFile);
        }
    }, [importFile]);

    return (
        <>
            <Canvas camera={{ position: [-8, 5, 8] }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[0, 10, 5]} intensity={1} />
                <Model
                    setExportTrigger={setExportTrigger}
                    importFile={importFile}
                    animationControl={animationControl}
                    loop={loop}
                    finalPosition={finalPosition}
                    finalScale={finalScale}
                    finalRotation={finalRotation}
                    duration={duration}
                    selectedAnimations={selectedAnimations}
                    playKeyframeAnimation={playKeyframeAnimation}
                    setAvailableAnimations={setAvailableAnimations}
                />
                <OrbitControls />
            </Canvas>

            <Draggable>
                <AnimationControls
                    finalPosition={finalPosition}
                    finalScale={finalScale}
                    finalRotation={finalRotation}
                    duration={duration}
                    handlePositionChange={handlePositionChange}
                    handleScaleChange={handleScaleChange}
                    handleRotationChange={handleRotationChange}
                    handleDurationChange={handleDurationChange}
                    handleImport={handleImport}
                    exportTrigger={exportTrigger}
                    togglePlayPause={togglePlayPause}
                    animationControl={animationControl}
                    playImage={playImage}
                    pauseImage={pauseImage}
                    loop={loop}
                    setLoop={setLoop}
                    loopActiveImage={loopActiveImage}
                    loopInactiveImage={loopInactiveImage}
                    availableAnimations={availableAnimations}
                    selectedAnimations={selectedAnimations}
                    handleAnimationSelect={handleAnimationSelect}
                    playKeyframeAnimation={playKeyframeAnimation}
                    setPlayKeyframeAnimation={setPlayKeyframeAnimation}
                />
            </Draggable>
        </>
    );
};

export default App;
