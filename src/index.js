const info = document.getElementById('info');
const canvas = document.getElementById('myCanvas'); // キャンバス要素の取得
const renderer = new THREE.WebGLRenderer({
  canvas,alpha:false
}); // レンダラの作成
const scene = new THREE.Scene();                    // シーンの作成

// カメラの作成
const CamX0=-100,CamY0=50,CamZ0=150;
const camera = new THREE.PerspectiveCamera(20, canvas.width/canvas.height, 0.1, 1000);
camera.position.set(CamX0, CamY0, CamZ0);
camera.lookAt(new THREE.Vector3(0, 20, 0));

//箱の生成(幅,高さ,奥行き)
const boxGeometry=new THREE.BoxGeometry(8,8,8);
const boxMaterial = new THREE.MeshPhongMaterial({color:'gray'});
const boxMesh=new THREE.Mesh(boxGeometry,boxMaterial);
//メッシュの位置を設定
boxMesh.receiveShadow=true;//落ちてきた影を表示する
boxMesh.castShadow=true;//影を落とす
boxMesh.position.set(0,2,-80);
scene.add(boxMesh);

// 平面の作成
const PlaneX0=100;
const PlaneY0=100;

const planeGeometry = new THREE.PlaneGeometry(PlaneX0,PlaneY0, 1, 1);
const planeMaterial = new THREE.MeshPhongMaterial({color:'lightgray'});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.set(- Math.PI / 2, 0, 0);
scene.add(plane);

// 球の作成(荷電粒子)
const numSpheres = 5; // 作成する球の数
const sphereRadius = 1; // 球の半径
const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 30, 30);
const sphereMaterial = new THREE.MeshPhongMaterial({color:'red'});

const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 20, 0);
scene.add(sphere);

// 磁場の作成
const CELL_NUM = 3;

const Biots = [];   //磁場オブジェクト本体の配列
const biotPositions = []; // 磁場オブジェクトの位置の配列

const biotGeometry = new THREE.CapsuleGeometry( 0.5, 3, 8, 5);
const biotMaterial = new THREE.MeshPhongMaterial({color:'blue'});

for (let i = 0; i < CELL_NUM; i++) {
  for (let j = 0; j < CELL_NUM; j++) {
    const biotMesh=new THREE.Mesh(biotGeometry,biotMaterial);
    const xPos = PlaneX0/CELL_NUM-i*PlaneX0/CELL_NUM;
    const yPos = PlaneY0/CELL_NUM-j*PlaneY0/CELL_NUM;
    biotMesh.position.set(PlaneX0/CELL_NUM-i*PlaneX0/CELL_NUM,2,PlaneY0/CELL_NUM-j*PlaneY0/CELL_NUM);
    biotMesh.receiveShadow=true;//落ちてきた影を表示する
    biotMesh.castShadow=true;//影を落とす（裏面が影を落とすので影が表示されない）
    Biots.push(biotMesh); // コーン（磁場を表すオブジェクト）を配列に追加
    biotPositions.push(new THREE.Vector3(xPos,2,yPos)); // 磁場の位置を配列に追加

    scene.add(biotMesh);//シーンに追加
  }
}


// 軸の作成
const axes = new THREE.AxesHelper(15);
scene.add(axes);

// 平行光源
const light = new THREE.DirectionalLight('white', 1);   // 白色、強度1（最大）
light.position.set(-40, 30, 30);                        // 光源の位置を設定
scene.add(light);                                       // シーンへ追加

// 設定したカメラ位置からシーンの描画（レンダリング）
renderer.render(scene, camera);

let B = document.getElementById("B"); //磁場のz成分のみ
let v_z = document.getElementById("v_z");
let q = document.getElementById("q");
let m = document.getElementById("m");
let ivy = document.getElementById("iv_y"); //初速度

let obj;            // 荷電粒子オブジェクト
let field;          // 磁場オブジェクト
const STEP = 0.1;   // 時間刻み幅
let time;           // 経過時間
let anime;          // アニメーションフラグ
let drag = false;     // マウスドラッグフラグ

// カメラコントローラを作成
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.2;

// 初期化（初回読込時 ＆ リセットボタンが押されたとき）
const init = () => {
  // 各種変数の初期化
  anime = false;
  animeOneStep = false;
  time = 0;
  X_Data = [1000];
  Y_Data = [1000];
  tData = [1000];
  field = {B: 1,by:2};//磁場
  obj = {q: 5,m: 10,px: 0,pxPrev: 0,py: 0,pyPrev: 0,vx: 0,vxPrev: 0,vy: 5,vyPrev: 5,pz:2,vz:1};//球  
  obj.py = -80;
  obj.pyPrev = -80;
  //球の初期化
  sphere.position.set(obj.px, obj.pz, obj.py);
  //磁場の初期化
  for (let i = 0; i < CELL_NUM*CELL_NUM; i++) {
    const biot = Biots[i];
    const position = biotPositions[i];

    // 位置の更新
    position.y = 2;
    biot.position.copy(position);

    //カメラ(位置を初期化)
    //camera.position.set(CamX0, CamY0, CamZ0);
    //camera.lookAt(new THREE.Vector3(0, 10, 0));

    //パラメータ
    setB();
    setq();
    setm();
    setvz();
    setvy();
    calcqv();
    displayQV();
    document.getElementById('btnSetPosR').disabled = false;
    document.getElementById('iv_y').disabled = false;

  }

  document.getElementById('btnAnime').value = 'アニメーション開始';
  draw();
  renderer.render(scene, camera);
}

// 描画処理
const draw = () => {

  // 経過時間の表示
  info.innerHTML = 'Time: ' + time.toFixed(3) + ' s';

  renderer.render(scene, camera);


  if (anime) {
    //電荷アニメーション

    // 位置ベクトルpの更新
    //オイラー法
    obj.px=obj.pxPrev + STEP*obj.vxPrev;
    obj.py=obj.pyPrev + STEP*obj.vyPrev;
    obj.pz += STEP*obj.vz;//z軸へ等速運動

    //電荷の球が磁界から出ていたら影響を受けないようにする
    if(Math.abs(obj.px) < PlaneX0/2 && Math.abs(obj.py) < PlaneY0/2){
      WithinMagneticField();
      console.log(obj.px);
      console.log(obj.py);
    }
    
    // 経過時間の計算
    time += STEP*0.01;

    //球オブジェクトに反映
    sphere.position.x = obj.px;
    sphere.position.y = obj.pz;
    //z軸とy軸を交換
    sphere.position.z = obj.py;

    // 値の更新
    obj.vxPrev = obj.vx;
    obj.vyPrev = obj.vy;
    obj.pxPrev = obj.px;
    obj.pyPrev = obj.py;

    //磁場アニメーション

    for (let i = 0; i < CELL_NUM*CELL_NUM; i++) {
      const biot = Biots[i];
      const position = biotPositions[i];
  
      // 位置の更新
      position.y += STEP*field.B*5;
      // 位置を反映
        // y座標が一定値を超えた場合、位置をリセットする
      if (position.y > 45 ) {
        position.y = 0;
      }
      if(position.y < -4){
        position.y = 30;
      }
      biot.position.copy(position);
      
    }
  
    
    calcqv();
    displayQV();

    
    // 描画の更新
    requestAnimationFrame(draw);
  }
}

const WithinMagneticField = () => {

    //修正オイラー法
    vxEuler = obj.vxPrev + STEP*((obj.q/obj.m)*obj.vyPrev*field.B);
    vyEuler = obj.vyPrev + STEP*((-obj.q/obj.m)*obj.vxPrev*field.B);
    //速度ベクトルvの更新
    obj.vx=obj.vxPrev + (STEP/2)*((obj.q/obj.m)*obj.vyPrev*field.B + (obj.q / obj.m) * vyEuler * field.B);
    obj.vy=obj.vyPrev + (STEP/2)*((-obj.q/obj.m)*obj.vxPrev*field.B + (-obj.q / obj.m) * vxEuler * field.B);

}

// アニメーション開始ボタンが押されたとき
const startAnime = () => {
  if (anime) {
    anime = false;
    document.getElementById('btnAnime').value = 'アニメーション再開';
  } else {
    anime = true;
    document.getElementById('btnAnime').value = 'アニメーション停止';
    document.getElementById('iv_y').disabled = true;
    document.getElementById('btnSetPosR').disabled = true;
    draw();
  }
}

//パラメータセット
function setB(){
  field.B = B.value;
  const currentValueB = document.getElementById('current-valueB');
  currentValueB.innerText = B.value;
  if(!anime){
    draw();
  }
}

function setq(){
  obj.q = q.value;
  const currentValueB = document.getElementById('current-valueq');
  currentValueB.innerText = q.value;
  if(!anime){
    draw();
  }
}
function setm(){
  obj.m = m.value;
  const currentValueB = document.getElementById('current-valuem');
  currentValueB.innerText = m.value;
  if(!anime){
    draw();
  }
}
function setvz(){
  obj.vz = v_z.value;
  const currentValueB = document.getElementById('current-valuev_z');
  currentValueB.innerText = v_z.value;
  if(!anime){
    draw();
  }
}
function setvy(){
  obj.vy = parseFloat(ivy.value);
  obj.vyPrev = parseFloat(ivy.value);
  const valueVy = document.getElementById('initV_Y');
  valueVy.innerText = parseFloat(ivy.value);
}
function SetPosR(){
    obj.px = parseFloat(-(obj.m*obj.vy)/(obj.q*field.B));
    obj.pxPrev = parseFloat(-(obj.m*obj.vy)/(obj.q*field.B));
    obj.py = 0;
    obj.pyPrev = 0;
    sphere.position.set(obj.px, obj.pz, obj.py);
    renderer.render(scene, camera);
    pvx.innerHTML = obj.px.toFixed(3);
    pvy.innerHTML = obj.py.toFixed(3);
    pvz.innerHTML = obj.pz.toFixed(3);
    draw();
}
function displayQV(){
  qvx.innerHTML = obj.vx.toFixed(3);
  qvy.innerHTML = obj.vy.toFixed(3);
  qvz.innerHTML = obj.vz;
  pvx.innerHTML = obj.px.toFixed(3);
  pvy.innerHTML = obj.py.toFixed(3);
  pvz.innerHTML = obj.pz.toFixed(3);
}
//速さ計算
function calcqv(){
  sizeV.innerHTML = Math.sqrt(obj.vx*obj.vx+obj.vy*obj.vy+obj.vz*obj.vz).toFixed(2);
}


// マウスドラッグ・ホイール操作中は描画を更新
canvas.addEventListener('mousemove', (e) => { if (!anime) draw(); });
canvas.addEventListener('mousedown', (e) => { if (!anime) drag = true; });
canvas.addEventListener('mouseup', (e) => { if (!anime) drag = false; });
canvas.addEventListener('wheel', (e) => { if (!anime) draw(); });


init();
