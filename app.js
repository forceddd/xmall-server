const express = require('express');
const app = express();
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser');
const cartListJSON = require('./db/cartList.json');
//分页函数
function pagination(pageSize, currentPage, data) {
    const skipNum = (currentPage - 1) * pageSize;
    return skipNum + pageSize >= data.length ? data.slice(skipNum, data.length) : data.slice(skipNum, skipNum + pageSize)
}
//排序函数 sort:1升序 a<b   -1降序 a>b
function sortBy(attr, sort) {
    return function (a, b) {
        return sort > 0 ? a[attr] - b[attr] : b[attr] - a[attr]
    }
}
//过滤函数
function range(data, gt, lt) {
    if (lt) {//lt>0
        //判断最小值是否合法
        return gt >= 0 ? data.filter(item => item.salePrice >= gt && item.salePrice <= lt) : data.filter(item => item.salePrice <= lt)
    } else {//lt=0 或者 lt =undefined
        return gt >= 0 ? data.filter(item => item.salePrice >= gt) : false;
    }

}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/api/goods/home', (req, res) => {
    fs.readFile('./db/home.json', 'utf8', (err, data) => {
        //fs获取的是字节流 还需要转换成json
        if (!err) {
            res.json(JSON.parse(data))
        }
    })
})
app.get('/api/goods/allGoods', (req, res) => {
    //获取前端地址栏的查询字符串
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);
    const sort = parseInt(req.query.sort);
    const gt = parseInt(req.query.gt);
    const lt = parseInt(req.query.lt);
    const cid = req.query.cid;
    let newData = [];
    fs.readFile('./db/allGoods.json', (err, data) => {
        //获取到的是字节流 要先解析
        const { result } = JSON.parse(data);
        //判断是否需要过滤
        let allData = (gt || lt) ? range(result.data, gt, lt) : result.data;

        if (cid === '1184') { //品牌周边
            allData = allData.filter((item) => item.productName.match(RegExp(/Smartisan/)))
            newData = allData
        }

        //判断是否需要排序
        if (sort) { //1  升序 a<b -1  降序 a>b
            newData = newData.sort(sortBy('salePrice', sort))
        }
        //分页显示
        newData = pagination(size, page, allData);
        //返回结果

        res.json({
            data: newData,
            total: allData.length
        })

    })
})
app.get('/api/goods/productDet', (req, res) => {
    fs.readFile('./db/goodsDetail.json', 'utf8', (err, data) => {
        if (!err) {
            const { result } = JSON.parse(data);
            const productId = req.query.productId;
            const newData = result.find(item => item.productId == productId);
            res.json(newData)
        }
    })
})
// 模拟一个登陆的接口
app.post('/api/login', (req, res) => {
    console.log(req.body.user);
    // 登录成功获取用户名
    let username = req.body.user
    //一系列的操作
    res.json({
        // 进行加密的方法
        // sing 参数一：加密的对象 参数二：加密的规则 参数三：对象
        token: jwt.sign({ username: username }, 'abcd', {
            // 过期时间
            expiresIn: "3000s"
        }),
        username,
        state: 1,
        file: '/static/images/1570600179870.png',
        code: 200,
        address: null,
        balance: null,
        description: null,
        email: null,
        message: null,
        phone: null,
        points: null,
        sex: null,
        id: 62
    })
})

// 登录持久化验证接口 访问这个接口的时候 一定要访问token（前端页面每切换一次，就访问一下这个接口，问一下我有没有登录/登陆过期）
// 先访问登录接口，得到token，在访问这个，看是否成功
app.post('/api/validate', function (req, res) {
    let token = req.headers.authorization;
    console.log(token);

    // 验证token合法性 对token进行解码
    jwt.verify(token, 'abcd', function (err, decode) {
        if (err) {
            res.json({
                msg: '当前用户未登录'
            })
        } else {
            // 证明用户已经登录
            res.json({
                token: jwt.sign({ username: decode.username }, 'abcd', {
                    // 过期时间
                    expiresIn: "3000s"
                }),
                username: decode.username,
                msg: '已登录',
                address: null,
                balance: null,
                description: null,
                email: null,
                file: "/static/images/1570600179870.png",
                id: 62,
                message: null,
                phone: null,
                points: null,
                sex: null,
                state: 1,
            })
        }
    })
})
app.post('/api/addCart', (req, res) => {
    let { userId, productId, productNum } = req.body;
    fs.readFile('./db/allGoods.json', (err, data) => {
        let { result } = JSON.parse(data);
        if (productId && userId) {
            let { cartList } = cartListJSON.result.find(item => item.id == userId);
            let newData = result.data.find(item => item.productId == productId);
            newData.limitNum = 100;
            if (productNum == -1) {
                //删除操作

                //fiter原来的数组不会变化
                // cartList = cartList.filter(item => item.productId != productId);
                cartList.some((item, index) => {
                    if (item.productId == productId) {
                        cartList.splice(index, 1)
                    }
                    return item.productId == productId
                });
                console.log(cartList.length);

            } else {
                // 找到对应的商品
                cartList.some(item => {
                    if (item.productId == productId) {
                        item.productNum++;
                    }
                    return item.productId == productId
                }) ? null : cartList.unshift({ ...newData, productNum: parseInt(productNum) });

            }



            // 序列化

            fs.writeFile('./db/cartList.json', JSON.stringify(cartListJSON), (err) => {
                if (!err) {
                    res.json({
                        code: 200,
                        message: "success",
                        result: cartListJSON.result.find(item => item.id == userId),
                        success: true,
                        timestamp: 1571296313981,
                    })
                }
            })
        }

    })

})

app.post('/api/cartList', (req, res) => {
    let { userId } = req.body;
    fs.readFile('./db/cartList.json', (err, data) => {
        let { result } = JSON.parse(data);
        let newData = result.find(item => item.id == userId);
        res.json({
            code: 200,
            cartList: newData,
            success: true,
            message: 'success'
        })
    })
})


app.listen(3000)