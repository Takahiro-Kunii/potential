//  2次元ベクトル間の距離を返す
//  座標[u, v]とした配列
function distance(a, b) {
    let u = a[0] - b[0];
    let v = a[1] - b[1];
    return Math.sqrt(u * u + v* v);
}

//  setPosで現在位置を指定し、forwordで進めながらsetGoalで指定されたゴールを目指す
//  この時、addObstructで指定された位置は通らないようにする
class PotentialFieldSolver {
    constructor () {
        this.obstructs = [];    //  障害物位置リスト
        this.goal = [0, 0];     //  ゴール位置
        this.pos = [0, 0];      //  現在位置
    }
    
    //  障害物追加
    addObstruct(pos) {
        this.obstructs.push(pos);
    }
    
    //  ゴール設定
    setGoal(pos) {
        this.goal = pos;
    }
    
    //  現在位置設定
    setPos(pos) {
        this.pos = [pos[0], pos[1]];
    }

    //  ゴールに到着していればtrue
    didArrive() {
    	return (distance(this.goal, this.pos) < 0.05);
    }
    
    //  障害物用ポテンシャル量重み付け関数
    obstruct_potential(d) {
        if (d == 0) return 10000;   //  0除算は避けて固定値とする
        const w = 0.05;             //  ゴール用の傾きを潰さない程度の大きさに抑える 0.03 - 0.07
        return w / d;
    }

    //  ゴール用ポテンシャル量重み付け関数
    goal_potential(d) {
        if (d == 0) return -10000;  //  0除算は避けて固定値とする
        const w = -1;
        return w / d;
    }
    
    //  posで指定された位置での総合ポテンシャルを返す
    potential(pos) {
        let total = 0;
        for (let obstruct of this.obstructs) {
            total += this.obstruct_potential(distance(pos, obstruct));
        }
        total += this.goal_potential(distance(pos, this.goal));
        return total;
    }
    
    //  forwordDistance分、移動する
    forword(forwordDistance) {
        const delta = 0.0001;     //  微分量 無限小にはできないので、適度に小さい値にする
		
		//  偏微分
		let p = this.potential(this.pos);   //  現在位置の値
		let u = this.pos[0];
		let v = this.pos[1];
		let du = (this.potential([u + delta, v]) - p) / delta;  //  u偏微分
		let dv = (this.potential([u, v + delta]) - p) / delta;  //  v偏微分
				
		//  正規化して[du, dv]を長さ1の方向ベクトルにする
		let l = Math.sqrt(du * du + dv * dv);
		du /= l;
		dv /= l;

		//  微分した値をそのまま使うと正の値に向かってしまうので、du, dvは微分値の逆数にする
		du = -du
		dv = -dv
		
		//  forwordDistanceの長さだけ進める
		this.pos[0] += du * forwordDistance;
		this.pos[1] += dv * forwordDistance;
    }
}

class PotentialField {
    //  表示する場は 1 x 1 のuv平面とする。
    //  このuv平面をxz平面に対応するように表示し、ポテンシャル値をy軸の高さで表現する。
    //  resolution:このuv平面の1単位を何分割して表示するかを指定。
    //  
    //  uv平面の1単位をそのままxz平面の1単位に対応させる。
    //  WebGLは右手座標系なので、x軸を右に、y軸を上に増加するよう表示した場合、z軸の
    //  増加方向が画面手前になっている点は注意すること。
    constructor (lab, param) {
     	this.lab = lab;
        this.resolution = param.resolution;

        //  ポテンシャル法を使って、出発点からゴールまでの経路を計算するオブジェクト        
        this.solver = new PotentialFieldSolver();

        //  ポテンシャル量表示用メッシュ作成
        this.makePotentialFieldVisual();    
	}
	
	makePotentialFieldVisual() {
        let geometry = new THREE.Geometry();

    	let vertex_destance = 1 / this.resolution;
	    let count = this.resolution;
        //  count x count の頂点で表示用平面を作る
        //    -> x（uに対応）
        //  ↓
        //  z（vに対応）
        //  
        //  countを4とした場合、geometry.verticesに入る順
    	//  0 -  1 -  2 -  3
    	//  |    |    |    |
    	//  4 -  5 -  6 -  7
    	//  |    |    |    |
    	//  8   ....    	
        for (let v = 0; v < count; v++) {
            for (let u = 0; u < count; u++) {
                let x = u * vertex_destance;
                let z = v * vertex_destance;
                geometry.vertices.push(new THREE.Vector3(x, 0, z));
            }
        }

        //  反時計回りに定義することでy軸の正の方向が表となる
    	//  0
    	//  |  \
    	//  4 - 5     
    	//              0,    4,            5
    	//      i = 0  (i)    (i + count)   (i + count + 1)
    	//  
    	//  0 - 1
    	//    \ |
    	//      5
    	//               0,   5,                 1
    	//      i = 0   (i)   (i + count + 1)    (i + count)	
        for (let v = 0; v < count - 1; v++) {
            for (let u = 0; u < count - 1; u++) {
                let i = v * this.resolution + u;
                geometry.faces.push(new THREE.Face3(i, i + count, i + count + 1));
                geometry.faces.push(new THREE.Face3(i, i + count + 1, i + 1));
            }
        }
        geometry.computeFaceNormals();

        //  形状の表現用メッシュ
        let material = new THREE.MeshNormalMaterial();
        //let material = new THREE.MeshLambertMaterial({color: 0xff8800})
        let mesh = new THREE.Mesh(geometry, material);
 
        //  形状の格子表現用メッシュ
        let wire = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
        let wireMesh = new THREE.Mesh(geometry, wire);
        mesh.add(wireMesh);
        this.lab.scene.add(mesh);

        //  現在位置マーカー                
        this.point = this.lab.makeBall({radius:0.01});

        this.geometry = geometry;
    }
    
    //  ポテンシャル量をそのままy値とせず、変化量を視認しやすい大きさに調整する
    //  あまり飛び出さないようにクリッピングも行う。負の値のクリップは緩め
    scaling(p) {
        const scale = 0.15;
        p *= scale;
    	return Math.max(-scale * 10, Math.min(scale, p));
    }
    
    //  ポテンシャル量をy値に反映させる
	potentialToGeometry() {
    	let vertex_destance = 1 / this.resolution;
	    let count = this.resolution;
        for (let iv = 0; iv < count; iv++) {
            for (let iu = 0; iu < count; iu++) {
                let u = iu * vertex_destance;
                let v = iv * vertex_destance;
                let p = this.scaling(this.solver.potential([u, v]));
                let i = iv * count + iu;
                this.geometry.vertices[i].y = p;
            }
        }
        this.geometry.computeFaceNormals();
    }
    
    //  マーカーの位置を更新する
    updatePoint() {
        let p = this.scaling(this.solver.potential(this.solver.pos)) + 0.01;
        this.point.position.set(this.solver.pos[0], p, this.solver.pos[1]);
    }
    
    //      ゴール：[0.9, 0.8]　それぞれ[u, v]位置を示す
    //      出発点：[0.0, 0.0]
    //      障害物：[0.1, 0.2]、...
    start() {
        this.solver.addObstruct([0.3, 0.3]);
        this.solver.addObstruct([0.5, 0.6]);
        this.solver.addObstruct([0.8, 0.6]);
        this.solver.addObstruct([0.4, 0.8]);
        this.solver.setGoal([0.9, 0.8]);
        this.solver.setPos([0, 0]);

        this.potentialToGeometry();
        this.updatePoint();
	}
	
	//  マーカー位置を少しずつ進める
	//  ゴールに到着したら、新しい位置を決めて再開
	update() {
        this.solver.forword(0.01);
        this.updatePoint();
        if (this.solver.didArrive()) {
            let u = Math.random() * 0.5;
            let v = Math.random() * 0.5;
            this.solver.setPos([u, v]);
        }
	}
}
