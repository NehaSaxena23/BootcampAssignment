/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-plusplus */
/* eslint-disable linebreak-style */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CronJob } from 'cron';

const port = 3000;
const server = express();
server.listen(port);
server.use(express.json());

interface Account {
  id : string ;
  name: string ;
  balance:number
}

const Accounts : Account[] = [];
// Accounts = [];

server.post('/accounts', (req, res) => {
  const requestBody = req.body;

  if (requestBody.name === undefined) {
    res.status(400);
  } else {
    const newAccount:Account = { id: uuidv4(), name: requestBody.name, balance: 0 };
    Accounts.push(newAccount);
    res.send(newAccount);
    res.status(201);
  }
});

server.get('/accounts', (req, res) => {
  res.send(Accounts);
  res.status(200);
});

server.get('/accounts/:accountId', (req, res) => {
  let index = null;
  for (index = 0; index < Accounts.length; index++) {
    if (req.params.accountId === Accounts[index].id) {
      res.send(Accounts[index]);
      res.status(200);
    }
  }
  if (index === Accounts.length) {
    res.send('');
    res.status(404);
  }
});

interface DepositTable {
  id : string;
  depositAmount: number;
}

const DepositTableEntries : DepositTable[] = [];

server.post('/accounts/:accountId/deposits', (req, res) => {
  let index = null;
  let isEntryExist:boolean = false;
  for (index = 1; index <= Accounts.length; index++) {
    if (req.params.accountId === Accounts[index - 1].id) {
      isEntryExist = true;
      const depositEntry : DepositTable = {
        id: req.params.accountId,
        depositAmount: req.body.amount,
      };
      DepositTableEntries.push(depositEntry);
      res.send(depositEntry);
      res.status(201);
    }
  }
  if (isEntryExist === false) {
    res.send('');
    res.status(400);
  }
});

const updateAccounts = (depositEntries:DepositTable[], currentAccounts:Account[]):boolean => {
  if (depositEntries.length === 0) {
    return false;
  // eslint-disable-next-line no-else-return
  } else {
    for (let index = 0; index < depositEntries.length; index++) {
      for (let pointer = 0; pointer < currentAccounts.length; pointer++) {
        if (depositEntries[index].id === currentAccounts[pointer].id) {
          currentAccounts[pointer].balance = currentAccounts[pointer].balance + depositEntries[index].depositAmount;
        }
      }
    }
    depositEntries.length = 0;
  }
  console.log('Accounts updated!');
  return true;
};
let scheduler : CronJob;
scheduler = new CronJob(
  '0 * * * * *',
  function() {
    updateAccounts(DepositTableEntries,Accounts);
    console.log('running a task every minute');
  },
  null,
  true,
  'system',
  null,
  null,
  null,
  null,
);

interface Product {
  id: string,
  title: string,
  description: string,
  stock: number,
  price: number
}

const products : Product[] = [
  {
    id: 'solar',
    title: 'Solar Panel',
    description: 'Super duper Essent solar panel',
    stock: 10,
    price: 750,
  },
  {
    id: 'insulation',
    title: 'Insulation',
    description: 'Cavity wall insulation',
    stock: 10,
    price: 2500,
  },
  {
    id: 'heatpump',
    title: 'Awesome Heatpump',
    description: 'Hybrid heat pump',
    stock: 10,
    price: 5000,
  },
];

interface Purchase {
  accountId : string,
  products : PurchasedProduct[]
}

interface PurchasedProduct {
  productId : string,
  purchasedDay : number
}

const purchaseList : Purchase[] = [];

server.post('/accounts/:accountId/purchases', (req, res) => {
  let index = null;
  let isAccountIdExist:boolean = false;
  let accountObjectPosition:number = 0;
  let productObjectPosition:number = 0;
  let isRequestProper = false;

  for (index = 0; index < Accounts.length; index++) {
    if (req.params.accountId === Accounts[index].id) {
      isAccountIdExist = true;
      accountObjectPosition = index;
      break;
    }
  }
  if (isAccountIdExist === false) {
    res.send('invalid Input');
    res.status(400);
  }
  if (isAccountIdExist === true) {
    let i:number;
    let doesProductExist = false;
    let productInStock = false;
    for (i = 0; i < products.length; i++) {
      if (req.body.productId === products[i].id) {
        doesProductExist = true;
        if (products[i].stock > 0) {
          productInStock = true;
          productObjectPosition = i;
        }
        break;
      }
    }
    if (doesProductExist === false) {
      res.send('invalid input');
      res.status(400);
    } else if (productInStock === false) {
      res.send('not enough stock');
      res.status(409);
    }
    if (isAccountIdExist === true && doesProductExist === true) {
      if (products[productObjectPosition].price > Accounts[accountObjectPosition].balance) {
        res.send('not enough funds');
        res.status(409);
      } else {
        for (i = 0; i < purchaseList.length; i++) {
          if (req.params.accountId === purchaseList[i].accountId) {
            // eslint-disable-next-line prefer-destructuring
            const length: number = purchaseList[i].products.length;
            if (Number(req.get('Simulated-Day')) < purchaseList[i].products[length - 1].purchasedDay) {
              res.send('Simulated day illegal');
              res.status(409);
              break;
            } else {
              isRequestProper = true;
            }
          } else {
            isRequestProper = true;
          }
        }
      }
      if (purchaseList.length === 0 || isRequestProper === true) {
        let purchaseAccountIdEntryExists:boolean = false;
        if (purchaseList.length != 0) {
          for (i = 0; i < purchaseList.length; i++) {
            if (req.params.accountId === purchaseList[i].accountId) {
              purchaseAccountIdEntryExists = true;
              const newPurchasedProduct : PurchasedProduct = {
                productId: req.body.productId,
                purchasedDay: Number(req.get('Simulated-Day')),
              };
              purchaseList[i].products.push(newPurchasedProduct);
              break;
            }
          }
        }
        if (purchaseAccountIdEntryExists === false || purchaseList.length === 0) {
          const purchaseEntry : Purchase = {
            accountId: req.params.accountId,
            products: [{
              productId: req.body.productId,
              purchasedDay: Number(req.get('Simulated-Day')),
            }],
          };
          purchaseList.push(purchaseEntry);
        }
        res.send('Request processed!');
        res.status(201);
      }
    }
  }
});

server.post('/products', (req, res) => {
  if (req.body.title === undefined) {
    res.status(400);
  } else {
    const newProduct: Product = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      stock: req.body.stock,
    };
    products.push(newProduct);
    res.send(newProduct);
  }
});

const getProductPurchasedCount = (productId:string,purchaseList:Purchase[],simulatedDay:number):number => {
  let productPurchasedCount:number = 0;
  for (let j = 0; j < purchaseList.length; j++) {
    for (let k = 0; k < purchaseList[j].products.length; k++) {
      if (productId === purchaseList[j].products[k].productId && purchaseList[j].products[k].purchasedDay <= Number(simulatedDay)) {
        productPurchasedCount++;
      }
    }
  }
  return productPurchasedCount;
};

server.get('/products', (req, res) => {
  const updatedProductList: Product[] = [];
  let newProduct:Product;

  for (let i = 0; i < products.length; i++) {
    let productPurchasedCount:number = 0;
    productPurchasedCount = getProductPurchasedCount(products[i].id, purchaseList, Number(req.get('Simulated-Day')));
    newProduct = {
      id: products[i].id,
      title: products[i].title,
      description: products[i].description,
      stock: products[i].stock - productPurchasedCount,
      price: products[i].price,
    };
    updatedProductList.push(newProduct);
  }
  res.send(updatedProductList);
  res.status(200);
});

server.get('/products/:productId', (req, res) => {
  let i:number;
  const productPurchasedCount: number = getProductPurchasedCount(req.params.productId, purchaseList, Number(req.get('Simulated-Day')));
  for (i = 0; i < products.length; i++) {
    if (req.params.productId === products[i].id) {
      const currentProduct: Product = {
        id: products[i].id,
        title: products[i].title,
        description: products[i].description,
        stock: products[i].stock - productPurchasedCount,
        price: products[i].price,
      };
      res.send(currentProduct);
      res.status(200);
      break;
    }
  }
  if (i === products.length) {
    res.send('Product doesnt exist');
    res.status(404);
  }
});

interface Interest {
  dayOfActivation: number,
  interestApplicable: number
}

const interestRateList: Interest[] = [];

server.post('/interest', (req, res) => {
  if (req.get('Simulated-Day') === '') {
    res.send('InvalidInput');
    res.status(400);
  } else {
    const interest:Interest = {
      interestApplicable: req.body.rate,
      dayOfActivation: Number(req.get('Simulated-Day')),
    };
    interestRateList.push(interest);
    res.send('InterestRateApplied');
    res.status(200);
  }
});
