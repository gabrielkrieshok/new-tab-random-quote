$(function(){
var url = "https://api.myjson.com/bins/141fzp.json";
var quote = $("#quoteblock");// the id of the heading
$.get(url, function (data) {
var the_quote = data;
var rando = Math.floor(Math.random()*data.length);
quote.text(the_quote[rando].quote);
var author = $("#author");// id of author
author.text("\u2014 "+the_quote[rando].author);
// var number = $("#number");// id of number
// number.text(rando);
});
});