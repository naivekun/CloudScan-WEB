import React from 'react';
import jsQR from 'jsqr';
import {Select, Row, Col, Divider, Typography, message, Slider} from 'antd';
import Axios from 'axios';

const {scanImageData} = require('zbar.wasm');

const {Option} = Select;
const {Title, Paragraph, Text, Link} = Typography;

window.url = ""

function drawLine(canvas, begin, end, color) {
    canvas.beginPath();
    canvas.moveTo(begin.x, begin.y);
    canvas.lineTo(end.x, end.y);
    canvas.lineWidth = 3;
    canvas.strokeStyle = color;
    canvas.stroke();
}

class Scan extends React.Component {
    videoSources = [];

    handleCameraChange(value) {
        console.log(`selected ${value}`);
        clearInterval(this.state.intervalId)
        this.setState({selectedId: value}, () => {
            // alert("change to  " + value )
            this.openCamera()
        })
    }

    openCamera() {
        let constraints = {
            video: {
                deviceId: undefined,
                width: 720,
                height: 720,
                facingMode: 'environment',
                zoom: true
            }
        };
        // alert("this is "+ this.state.selectedId)
        if (this.state.videoSources.length) {
            console.log("source", this.state.selectedId)
            constraints.video.deviceId = {exact: this.state.selectedId};
            let canvas = this.canvasDom.current.getContext("2d");
            navigator.mediaDevices.getUserMedia(constraints).then(stream => {
                this.canvasDom.current.height = 720
                this.canvasDom.current.width = 720
                this.video.srcObject = stream
                this.video.play()
                console.log(this.video)
                console.log(this.videoDom.current)
                let videoTrack = stream.getVideoTracks()[0];
                let zoomOptions = undefined;
                if (this.state.isChrome && ('zoom' in videoTrack.getCapabilities())){
                    let cap = videoTrack.getCapabilities();
                    zoomOptions = {min:cap.zoom.min,max:cap.zoom.max}
                    // console.log(1)
                }
                let id = setInterval(() => {
                    // console.log(this.state.zoom)
                    if (zoomOptions){
                        if (window.zoom !== this.state.zoom){
                            window.zoom = this.state.zoom;
                            let realZoom = zoomOptions.min + (zoomOptions.max-zoomOptions.min) * window.zoom
                            videoTrack.applyConstraints({advanced:[{zoom:realZoom}]});
                        }
                    }
                    canvas.drawImage(this.video, 0, 0, 720, 720)
                    var imageData = canvas.getImageData(0, 0, 720, 720);
                    // console.log(imageData)
                    var code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
                    // scanImageData(imageData).then(codes => {
                    //     if (codes.length > 0) {
                    //         let code = codes[0]
                    //         // console.log(codes[0].decode())
                    //         // console.log(codes[0])
                    //         let data = code.decode()
                    //         this.p.current.textContent = data
                    //         if (window.url !== data) {
                    //             window.url = data
                    //             Axios.post('https://cloudscan.earthc.moe/url/add', {
                    //                 url: data
                    //             }).then(
                    //                 res => {
                    //                     console.log(res)
                    //                     message.info(res.data.status,2)
                    //                 }
                    //             ).catch(e => {
                    //                 message.error(e.toString(),2)
                    //                 window.url = ""
                    //             })
                    //         }
                    //         drawLine(canvas, code.points[0], code.points[1], "#FF00B7");
                    //         drawLine(canvas, code.points[1], code.points[2], "#FF00B7");
                    //         drawLine(canvas, code.points[2], code.points[3], "#FF00B7");
                    //         drawLine(canvas, code.points[3], code.points[0], "#FF00B7");
                    //     }
                    // })
                    if (code) {
                        this.p.current.textContent = code.data
                        let data = code.data
                        drawLine(canvas, code.location.topLeftCorner, code.location.topRightCorner, "#FF00B7");
                        drawLine(canvas, code.location.topRightCorner, code.location.bottomRightCorner, "#FF00B7");
                        drawLine(canvas, code.location.bottomRightCorner, code.location.bottomLeftCorner, "#FF00B7");
                        drawLine(canvas, code.location.bottomLeftCorner, code.location.topLeftCorner, "#FF00B7");
                        if (window.url !== data) {
                            window.url = data
                            Axios.post('/url/add', {
                                url: data
                            }).then(
                                res => {
                                    console.log(res)
                                    message.info(res.data.status, 2)
                                }
                            ).catch(e => {
                                message.error(e.toString(), 2)
                                window.url = ""
                            })
                        }
                    }
                }, 100);
                this.setState({intervalId: id})
            }).catch(e => {
                console.log(e)
            })
        }
    }

    loadVideoSources = async () => {
        navigator.mediaDevices.enumerateDevices().then(sources => {
            let videoSources = []
            sources.forEach(source => {
                if (source.kind === "videoinput") {
                    videoSources.push(source)
                }
            })
            this.setState({
                videoSources: videoSources,
                selectedId: videoSources[videoSources.length - 1].deviceId
            })
            this.openCamera()
        }).catch(e => {
            message.error(e.toString(), 3)
        })

    }

    constructor(props) {
        super(props);
        this.canvasDom = React.createRef();
        this.videoDom = React.createRef();
        this.p = React.createRef();
        let isChrome = navigator.userAgent.includes("Chrome");
        this.state = {videoSources: [], isChrome: isChrome,zoom:0};
        this.video = document.createElement("video");
    }

    zoomOnChange = value =>{
        this.setState({
            zoom: value,
        });
        console.log(value)

    }

    componentDidMount() {
        this.loadVideoSources()
    }

    render() {
        return (
            <div>
                <Divider>选择相机</Divider>

                <Row>
                    <Col span={18} offset={3}>
                        <Select disabled={this.state.videoSources.length === 0}
                                style={{width: "100%"}}
                                value={this.state.videoSources.length === 0 ? "None" : this.state.selectedId}
                                onChange={this.handleCameraChange.bind(this)}
                        >
                            {
                                this.state.videoSources.map((item) => {
                                    console.log("item", item.deviceId)
                                    return (<Option key={item.deviceId} value={item.deviceId}>{item.label}</Option>)
                                })
                            }
                        </Select>
                    </Col>
                </Row>
                <Row>
                    <Col span={22} offset={1}>
                        <Slider min={0}
                                max={1} step={0.01} defaultValue={0} disabled={!this.state.isChrome}
                                onChange={this.zoomOnChange}/>
                    </Col>
                </Row>
                <Divider/>
                <Row>
                    <Col span={22} offset={1}>
                        <div>
                            <canvas style={{width: "100%"}} ref={this.canvasDom}></canvas>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col span={22} offset={1}>
                        <p ref={this.p}></p>
                    </Col>
                </Row>
                <Divider/>

                <Row>
                    <Col span={18} offset={3}>
                        <Typography>
                            <Paragraph>
                                iOS用户可能需要在 系统设置->Safari设置->相机 设置允许所有网站访问，才能正常使用选择相机。
                            </Paragraph>
                        </Typography>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default Scan;