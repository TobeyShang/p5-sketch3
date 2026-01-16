/**
 * lathe.js 
 * 修改：以 x=0 为中心轴旋转，确保模型实心
 */
function lathe(rawPath) {
    // 1. 重新采样：让点分布更均匀
    const path = resample(rawPath, 1/15);
    
    // 只计算 Y 轴的平均值进行垂直居中，保留 X 轴作为半径
    let sumY = 0;
    for(let p of path) sumY += p.y;
    let avgY = sumY / path.length;
    
    // 将点转换到以旋转轴 (x=0) 为基准的相对坐标
    const relative = path.map((pt) => createVector(pt.x, pt.y - avgY));
    
    const geom = buildGeometry(() => {
        fill(255);
        noStroke();
        const rotations = [];
        const detail = 60; 
        for (let i = 0; i <= detail; i++) {
            const angle = map(i, 0, detail, 0, TWO_PI);
            const mat = new p5.Matrix();
            mat.rotateY(angle);
            rotations.push(mat);
        }
        
        for (let i = 0; i < relative.length - 1; i++) {
            const curr = relative[i];
            const next = relative[i+1];
            beginShape(QUAD_STRIP);
            for (const rot of rotations) {
                vertex(...rot.multiplyPoint(curr).array());
                vertex(...rot.multiplyPoint(next).array());
            }
            endShape();
        }
    });
    
    geom.clearColors();
    geom.computeNormals(SMOOTH); 
    return { geom, avgY };
}

function resample(stroke, density) {
    let length = 0;
    const lengths = [0];
    for (let i = 1; i < stroke.length; i++) {
        length += stroke[i-1].dist(stroke[i]);
        lengths.push(length);
    }
    const samples = ceil(length * density);
    const res = [];
    for (let i = 0; i < samples; i++) {
        const target = (i/(samples-1)) * length;
        const fromIdx = lengths.findLastIndex((l) => l <= target);
        if (fromIdx === stroke.length-1) {
            res.push(stroke[fromIdx]);
        } else {
            const t = map(target, lengths[fromIdx], lengths[fromIdx+1], 0, 1, true);
            res.push(p5.Vector.lerp(stroke[fromIdx], stroke[fromIdx+1], t));
        }
    }
    return res;
}