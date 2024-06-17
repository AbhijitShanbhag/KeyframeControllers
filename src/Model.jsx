import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

const Model = ({ setExportTrigger, importFile, animationControl, loop, finalPosition, finalScale, finalRotation, duration, selectedAnimations, playKeyframeAnimation, setAvailableAnimations }) => {
    const groupRef = useRef();
    const { scene } = useThree();
    const [mixer] = useState(() => new THREE.AnimationMixer());
    const clock = new THREE.Clock();
    const [actions, setActions] = useState({});
    const [modelLoaded, setModelLoaded] = useState(false);
    const [pausedAt, setPausedAt] = useState(0);

    const resetToInitialFrame = () => {
        if (groupRef.current) {
            const model = groupRef.current.getObjectByName('myModel');
            if (model) {
                model.position.set(0, 0, 0);
                model.scale.set(1, 1, 1);
                model.quaternion.set(0, 0, 0, 1);
            }
        }
    };

    useEffect(() => {
        if (groupRef.current && importFile) {
            while (groupRef.current.children.length) {
                groupRef.current.remove(groupRef.current.children[0]);
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                const contents = e.target.result;
                const loader = new GLTFLoader();
                loader.parse(contents, '', function (gltf) {
                    const model = gltf.scene;
                    model.name = 'myModel';
                    groupRef.current.add(model);
                    model.position.set(0, 0, 0);
                    model.scale.set(1, 1, 1);
                    model.quaternion.set(0, 0, 0, 1);

                    const existingAnimations = gltf.animations || [];
                    const newActions = {};

                    const animationNames = existingAnimations.map(animation => animation.name);
                    setAvailableAnimations(animationNames);

                    existingAnimations.forEach(animation => {
                        const action = mixer.clipAction(animation, model);
                        action.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
                        action.clampWhenFinished = !loop;
                        newActions[animation.name] = action;
                    });

                    const positionKF = new THREE.VectorKeyframeTrack('myModel.position', [0, duration], [0, 0, 0, ...finalPosition]);
                    const scaleKF = new THREE.VectorKeyframeTrack('myModel.scale', [0, duration], [1, 1, 1, ...finalScale]);
                    const rotationKF = new THREE.QuaternionKeyframeTrack(
                        'myModel.quaternion',
                        [0, duration],
                        [
                            0, 0, 0, 1,
                            ...new THREE.Quaternion().setFromEuler(new THREE.Euler(...finalRotation.map(r => r * (Math.PI / 180)))).toArray()
                        ]
                    );

                    const customClip = new THREE.AnimationClip('CustomAnimation', duration, [positionKF, scaleKF, rotationKF]);
                    const customAction = mixer.clipAction(customClip, model);
                    customAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
                    customAction.clampWhenFinished = !loop;
                    newActions['CustomAnimation'] = customAction;

                    setActions(newActions);
                    setModelLoaded(true);
                    setExportTrigger(() => () => handleExport(scene, gltf, selectedAnimations, existingAnimations, customClip));
                });
            };
            reader.readAsArrayBuffer(importFile);
        }
    }, [importFile, mixer, scene, setExportTrigger, loop, finalPosition, finalScale, finalRotation, duration, selectedAnimations, setAvailableAnimations]);

    useFrame(() => {
        const delta = clock.getDelta();
        if (animationControl === 'play') {
            mixer.update(delta);
        } else if (animationControl === 'pause') {
            mixer.update(0);
        }
    });

    useEffect(() => {
        if (modelLoaded) {
            if (animationControl === 'play') {
                Object.keys(actions).forEach(name => {
                    if (selectedAnimations.includes(name) || (name === 'CustomAnimation' && playKeyframeAnimation)) {
                        actions[name].paused = false;
                        actions[name].play();
                    }
                });
                mixer.timeScale = 1;
            } else if (animationControl === 'pause') {
                setPausedAt(mixer.time);
                mixer.timeScale = 0;
                Object.keys(actions).forEach(name => {
                    actions[name].paused = true;
                });
            }
        }
    }, [animationControl, actions, selectedAnimations, modelLoaded, mixer, playKeyframeAnimation]);

    const handleExport = (scene, gltf, selectedAnimations, existingAnimations, customClip) => {
        resetToInitialFrame();

        const mergedTracks = {};

        selectedAnimations.forEach((animationName) => {
            const animation = existingAnimations.find((anim) => anim.name === animationName);
            if (animation) {
                animation.tracks.forEach((track) => {
                    if (!mergedTracks[track.name]) {
                        mergedTracks[track.name] = track.clone();
                    } else {
                        const existingTrack = mergedTracks[track.name];
                        const values = new Float32Array(existingTrack.values.length + track.values.length);
                        values.set(existingTrack.values);
                        values.set(track.values, existingTrack.values.length);
                        const times = new Float32Array(existingTrack.times.length + track.times.length);
                        times.set(existingTrack.times);
                        times.set(track.times.map(time => time + existingTrack.times[existingTrack.times.length - 1]), existingTrack.times.length);
                        existingTrack.values = values;
                        existingTrack.times = times;
                    }
                });
            }
        });

        if (playKeyframeAnimation) {
            customClip.tracks.forEach((track) => {
                if (!mergedTracks[track.name]) {
                    mergedTracks[track.name] = track.clone();
                } else {
                    const existingTrack = mergedTracks[track.name];
                    const values = new Float32Array(existingTrack.values.length + track.values.length);
                    values.set(existingTrack.values);
                    values.set(track.values, existingTrack.values.length);
                    const times = new Float32Array(existingTrack.times.length + track.times.length);
                    times.set(existingTrack.times);
                    times.set(track.times.map(time => time + existingTrack.times[existingTrack.times.length - 1]), existingTrack.times.length);
                    existingTrack.values = values;
                    existingTrack.times = times;
                }
            });
        }

        const mergedClip = new THREE.AnimationClip('MergedAnimation', -1, Object.values(mergedTracks));
        const gltfExporter = new GLTFExporter();
        const options = {
            binary: true,
            animations: [mergedClip],
        };

        const link = document.createElement('a');
        link.style.display = 'none';
        document.body.appendChild(link);
        function save(blob, filename) {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        }
        function saveString(text, filename) {
            save(new Blob([text], { type: 'text/plain' }), filename);
        }
        function saveArrayBuffer(buffer, filename) {
            save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
        }

        gltfExporter.parse(scene, function (result) {
            if (result instanceof ArrayBuffer) {
                saveArrayBuffer(result, 'Exported.glb');
            } else {
                const output = JSON.stringify(result, null, 2);
                console.log(output);
                saveString(output, 'Exported.gltf');
            }
        }, function (error) {
            console.error('An error occurred during the export:', error);
        }, options);
    };

    return (
        <group ref={groupRef} />
    );
};

export default Model;
