const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
require("dotenv").config(); 

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
});

const itemsSchema = {
  name: String,
};

const Item = mongoose.model("Item", itemsSchema);

const defaultItems = [
  { name: "Welcome to your todolist!" },
  { name: "Hit the + button to add a new item." },
  { name: "<-- Hit this to delete an item." },
];

const listSchema = {
  name: String,
  items: [itemsSchema],
};

const List = mongoose.model("List", listSchema);

app.get("/", async function (req, res) {
  try {
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log(foundItems);
      res.redirect("/");
    } else {
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });
    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName,
  });

  if (listName === "Today") {
    await item.save();
    res.redirect("/");
  } else {
    try {
      const foundList = await List.findOne({ name: listName });
      if (!foundList) {
        const list = new List({
          name: listName,
          items: [item],
        });
        await list.save();
        res.redirect("/" + listName);
      } else {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      const foundList = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } },
        { new: true }
      );
      if (foundList) {
        res.redirect("/" + listName);
      } else {
        console.error("List not found");
        res.status(500).send("Internal Server Error");
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
});

const port = process.env.PORT;

app.listen(port, function () {
  console.log(`Server is running on port ${port}.`);
});
