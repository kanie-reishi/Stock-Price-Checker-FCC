'use strict';
const StockModel = require("./models.js").Stock;
const fetch = require("node-fetch");
// Create stock function

async function createStock(stock, like, ip) {
  const newStock = new StockModel({ symbol: stock, likes: like === true ? [ip] : [] });// Check if the ip is already in the likes array
  return await newStock.save();
}
// Find stock function

async function findStock(stock) {
  return await StockModel.findOne( { symbol: stock } ).exec(); // find the stock with the symbol; exec() executes the query
}

// Save stock to database
async function saveStock(stock, like, ip) {
  let savedStock = {};
  const foundStock = await findStock(stock);
  if(!foundStock) {
    if(!stock) return savedStock;
    savedStock = await createStock(stock, like, ip); // Create stock if it doesn't exist
    return savedStock;
  } else {
    if (like && !foundStock.likes.includes(ip)) { // Check if the ip is already in the likes array
      foundStock.likes.push(ip); // Add ip to likes array
      savedStock = await foundStock.save(); // Save stock
      return savedStock;
    }
    savedStock = foundStock;
    return savedStock;
  }
}

// Fetch stock data from external API
async function getStock(stock) {
  const response = await fetch(
    `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
  const { symbol, latestPrice } = await response.json();
  return {symbol, latestPrice};
}
module.exports = function (app) {

  // https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
  app.route('/api/stock-prices')
    .get(async function (req, res){
      const {stock, like } = req.query;
      if(Array.isArray(stock)) {
        const [stock1, stock2] = stock;
        const [stock1Data, stock2Data] = await Promise.all([getStock(stock1), getStock(stock2)]);
        const [stock1Saved, stock2Saved] = await Promise.all([saveStock(stock1, like, req.ip), saveStock(stock2, like, req.ip)]);
        let stockData = [];
        if(!stock1Data.symbol){
           stockData.push({rel_likes: stock1Saved.likes.length - stock2Saved.likes.length});
        } else {
          stockData.push({stock: stock1Data.symbol, price: stock1Data.latestPrice, rel_likes: stock1Saved.likes.length - stock2Saved.likes.length});
        }
        if(!stock2Data.symbol){
          stockData.push({rel_likes: stock2Saved.likes.length - stock1Saved.likes.length});
        } else {
          stockData.push({stock: stock2Data.symbol, price: stock2Data.latestPrice, rel_likes: stock2Saved.likes.length - stock1Saved.likes.length});
        }
        res.json({ stockData });
        return;
      } else {
      const { symbol, latestPrice } = await getStock(stock);
      if(!symbol){
        res.json({ stockData: { likes: like === true ? 1 : 0 } });
        return;
      }
      
    
      const oneStockData = await saveStock(symbol, like, req.ip);
      res.json({
        stockData: {
          stock: symbol,
          price: latestPrice,
          likes: oneStockData.likes.length
        }
      });
    }
  });
};
