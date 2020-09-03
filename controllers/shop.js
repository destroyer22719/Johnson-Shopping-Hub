const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path')
const PDFDocument = require('pdfkit');
const user = require('../models/user');
const product = require('../models/product');
const itemPerPage = 3;
const { validationResult } = require('express-validator/check');

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product
  .find()
  .countDocuments()
  .then(numProducts => {
    totalItems = numProducts
    return Product
    .find()
    .skip((page-1) * itemPerPage)
    .limit(itemPerPage)
  })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Produdct List',
        path: '/products',
        currentPage: page,
        hasNextPage: itemPerPage * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / itemPerPage) 
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })
};

exports.getProduct = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        errorMessage:message,
        showForm:false,
        path: '/products',
        prodId:prodId,
        validationErrors:[]
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })};
exports.postReview = (req, res, next) => {
  const rating = req.body.rating;
  const title = req.body.title;
  const review = req.body.review;
  const prodId = req.body.prodId;
  const prodTitle = req.body.productTitle
  const errors = validationResult(req);

  const finalReview = {
    userName:req.user.username,
    userId:req.user._id,
    rating:rating,
    title:title,
    review:review
  }
    Product.findOne({title: prodTitle },(err, result) => {
    if (err) return next(err);
    const errors = validationResult(req);
    console.log(errors.array())
    if(!errors.isEmpty()){
      return res.status(422)
      .render('shop/product-detail', {
        product: result,
        pageTitle: result.title,
        path: '/products',
        prodId:prodId,
        showForm:true,
        errorMessage: errors.array()[0].msg,
        validationErrors: errors.array()
      });
    }
    result.reviews.push(finalReview);
    result.save()
    return res.redirect('/product/'+prodId)
    })
  }

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product
  .find()
  .countDocuments()
  .then(numProducts => {
    totalItems = numProducts
    return Product
    .find()
    .skip((page-1) * itemPerPage)
    .limit(itemPerPage)
  })
    .then( products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        currentPage: page,
        hasNextPage: itemPerPage * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / itemPerPage) 
      });
    })
    .catch(err => {
      console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      
      const products = user.cart.items;
      console.log(products)
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => {
      // console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};
exports.decreaseCart = (req, res, next) => {
  const prodId = req.body.productId;
  const cartId = req.body.cartId;
  Product.findById(prodId)
  .then(product => {
    return req.user.decreaseCart(product)
  })
  .then(result => {
    console.log(result)
    res.redirect('/cart')
  })
}
exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      let total = 0;
      products.forEach(p => {
        total += p.quantity * p.productId.price;
      })
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalSum: total
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })
}
exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500
      return next(error)
    })};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById (orderId).then(order => {
    if (!order){
      return next(new Error('No Order found'))
    }
    if(order.user.userId.toString() !== req.user._id.toString()){
      return next(new Error('Unauthorized'))
    }
    const invoiceName = 'invoice:' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName)

    const pdfDoc = new PDFDocument();
    res.setHeader('Content-Type', 'application.pdf');
    res.setHeader('Contet-Disposition', 'inline; filename="'+ invoiceName +'"')
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc.fontSize(26).text('Invoice', {
      underline: true
    });
    let totalPrice = 0;
    order.products.forEach(prod => {
      totalPrice += prod.quantity * prod.product.price
      pdfDoc
      .fontSize(14)
      .text(`${prod.product.title} (${prod.quantity}) $ ${prod.product.price}`)
    })
    pdfDoc.text(`----------------`)

    pdfDoc.text(`Total Price: ${totalPrice}`)
    pdfDoc.end()
    // fs.readFile(invoicePath, (err, data) => {
    //   if (err) {
    //     return next(err)
    //   }
    //   res.setHeader('Content-Type', 'application/pdf');
    //   res.setHeader('Contet-Disposition', 'inline; filename="'+ invoiceName +'"')
    //   res.send(data)
    // })
    // const file = fs.createReadStream(invoicePath);

    // file.pipe(res)
  })
  .catch(err => console.log(err))

}