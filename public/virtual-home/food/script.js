let currentUser;
const loadContent = () => {
  $.get("/api/home/current-user")
    .done((data) => {
      console.log(data);
      const user = data.user;
      currentUser = user; // Store the current user globally
      // Setting status divs
      $(".hunger-text").text(user.hunger + "%");
      $(".hunger-fill").css("width", `${user.hunger}%`);
      if (user.hunger < 10) {
        $(".hunger-warning").text("You are starving!");
      }
      $(".tiredness-text").text(user.tiredness + "%");
      $(".tiredness-fill").css("width", `${user.tiredness}%`);
      if (user.tiredness > 90) {
        $(".tiredness-warning").text("You are exhausted!");
      }
    })
    .fail((xhr) => {
      console.error(xhr.responseJSON);
    });
  $.get("/api/home/food")
    .done((data) => {
      console.log(data);
      if (!data.success) {
        $(".food-container").html(
          '<p class="error">Failed to load food items.</p>'
        );
        return;
      }
      const foodItems = data.food;
      const foodContainer = $(".food-container");

      foodContainer.html(
        foodItems.map(
          (item) => `<div class="food-item ${
            item.isForPets ? "food-pets" : "food-no-pets"
          }" id="${item._id}">
          <img src="/media/${item.name}.png" alt="${item.name}">
          <h3>${item.name.slice(0, 1).toUpperCase() + item.name.slice(1)}</h3>
          <p>${item.hungerValue}🍖</p>
          <p>${
            item.isForPets
              ? "✅   Food IS for pets"
              : "❌   Food is NOT for pets"
          }</p>
          <div class="button-container">
          <button class="eat-btn">Eat</button>
          <button class="feed-btn">Feed</button>
          </div>
          </div>`
        )
      );
    })
    .fail((xhr) => console.error(xhr.responseJSON));
};

loadContent();

$(".food-container").on("click", ".eat-btn", function () {
  const id = $(this).parent().parent().attr("id");
  $.post("/api/home/feed", { foodId: id, userId: currentUser._id })
    .done((data) => {
      if (!data.success) {
        alert("Failed to eat the food item.");
        return;
      }
      location.reload();
    })
    .fail((xhr) => console.error(xhr.responseJSON));
});

let foodId;

$(".food-container").on("click", ".feed-btn", async function () {
  const id = $(this).parent().parent().attr("id");
  let showPetsBtn = true;
  if ($(this).parent().parent().hasClass("food-no-pets")) {
    showPetsBtn = false;
  }
  foodId = id; // Store the food ID globally
  //open popup with users and pets
  $("#popup-overlay, #popup").fadeIn(200);
  $("#popup .heading").text("Select who to give the food to:");
  $("#popup button").show();
  if (!showPetsBtn) {
    $("#popup #pets-btn").hide();
  }
  $("#popup .food-to-make-container").hide();
  $("#popup .feeders-container").html("");
});

$("#popup").on("click", "#users-btn", async function () {
  console.log("Users button clicked");
  let users;
  await $.get("/api/home/users").done((data) => (users = data.users));
  const usersHTML = users.map((user) => {
    if (user._id === currentUser._id) return "";
    if (user._id === "68568dca6fc69c7cea58f550") {
      // Handle Vojtik seperately
      return `<div class="feeder-container" id="${user._id}">
      <div class="img-container" id="vojtik-img-container">
      <img id="vojtik-img" src="/media/vojtik_character.png" alt="avatar img">
      </div>
      <div class="feeder-info">
      <h3>${user.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Hunger:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${user.hunger}%"></div>
          <div class="hunger-text">${user.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Tiredness:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${user.tiredness}%"></div>
          <div class="tiredness-text">${user.tiredness}%</div>
        </div>
      </div>
      </div>
    </div>
      </div>`;
    }
    if (user.isKid) {
      return `<div class="feeder-container" id="${user._id}">
      <div class="img-container">
      <img src="/media/${
        "kid" + Math.floor(Math.random() * 2 + 1)
      }.png" alt="avatar img">
      </div>
      <div class="feeder-info">
      <h3>${user.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Fullness:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${user.hunger}%"></div>
          <div class="hunger-text">${user.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Tiredness:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${user.tiredness}%"></div>
          <div class="tiredness-text">${user.tiredness}%</div>
        </div>
      </div>
    </div>
    </div>
      </div>`;
    }
    return "ERROR";
  });
  $("#popup .feeders-container").html(usersHTML.join(""));
  $(".feeder-container").on("click", function () {
    const isPet = $(this).hasClass("pet-container");
    const id = $(this).attr("id");
    //Send userId or petId based on the type
    $.post("/api/home/feed", {
      foodId,
      userId: isPet ? "" : id,
      petId: isPet ? id : "",
    }).done((data) => {
      if (!data.success) {
        alert("Failed to feed the item.");
        return;
      }
      location.reload();
    });
  });
});

//Pets feed btn
$("#popup").on("click", "#pets-btn", async function () {
  console.log("Pets button clicked");
  let pets;
  await $.get("/api/home/pets").done((data) => (pets = data.pets));
  const petsHTML = pets.map((pet) => {
    return `<div class="feeder-container pet-container" id="${pet._id}">
      <div class="img-container">
      <img src="/media/${pet.type}.png" alt="avatar img">   
      </div>
      <div class="feeder-info">
      <h3>${pet.name}</h3>
      <div class="status-container">
      <div class="status-inner">
      Hunger:
        <div class="hunger">
          <div class="hunger-fill" style="width: ${pet.hunger}%"></div>
          <div class="hunger-text">${pet.hunger}%</div>
        </div>
      </div>
      <div class="status-inner">
      Cuddles:
        <div class="tiredness">
          <div class="tiredness-fill" style="width: ${pet.cuddleNeed}%"></div>
          <div class="tiredness-text">${pet.cuddleNeed}%</div>
        </div>
      </div>
      <div class="status-inner">
      Playfulness:
        <div class="playfulness">
          <div class="playfulness-fill" style="width: ${pet.playNeed}%"></div>
          <div class="playfulness-text">${pet.playNeed}%</div>
        </div>
      </div>
      </div>
    </div>
    </div>
      </div>`;
  });
  $("#popup .feeders-container").html(petsHTML.join(""));
  $(".feeder-container").on("click", function () {
    const isPet = $(this).hasClass("pet-container");
    const id = $(this).attr("id");
    //Send userId or petId based on the type
    $.post("/api/home/feed", {
      foodId,
      userId: isPet ? "" : id,
      petId: isPet ? id : "",
    })
      .done((data) => {
        if (!data.success) {
          alert("Failed to feed the item.");
          return;
        }
        location.reload();
      })
      .fail((xhr) => {
        alert("Failed to feed the item, probably food not for pets.");
      });
  });
});

$(".make-food-btn").click(function () {
  // Open the make food popup
  $("#popup-overlay, #popup").fadeIn(200);
  $("#popup .heading").text("Select food to make:");
  $("#popup button").hide();
  $("#popup .feeders-container").html("");
  $("#popup .food-to-make-container").show();
});

$("#popup").on("click", ".food-to-make-item", function () {
  const foodId = $(this).attr("id");
  switch (foodId) {
    case "redbull":
      redbullMiniGame();
      break;
    case "pizza":
      pizzaMiniGame();
      break;
    case "twister":
      twisterMiniGame();
      break;
    case "soup":
      soupMiniGame();
      break;
    case "pasta":
      pastaMiniGame();
      break;
    default:
      console.error("No food minigame found");
      location.reload();
  }
  $.post("/api/home/activity/food", { foodType: foodId })
    .done((data) => {
      if (!data.success) {
        alert("Failed to make the food item.");
        return;
      }
      //location.reload();
    })
    .fail((xhr) => console.error(xhr.responseJSON));
  //$("#popup-overlay, #popup").fadeOut(200);
});

$("#popup-overlay").click(() => $("#popup-overlay, #popup").fadeOut(200));

const draggableUpdate = () => {
  $("#minigame-container img")
    .attr("draggable", "false")
    .on("contextmenu", (e) => e.preventDefault());
};

const redbullMiniGame = () => {
  $(".food-to-make-container").html("");
  $("#popup .heading").text("Drag the card to pay");

  $("#minigame-container").html(`
    <div class="redbull">
    <img src="/media/redbull.png" alt="redbull">
    </div>
      <div class="credit-card">
        <img src="/media/credit-card.avif" alt="credit-card" />
      </div>
      <div class="space"></div>
      <div class="terminal">
        <img src="/media/terminal.png" alt="card-terminal" />
      </div>`);
  draggableUpdate();
  const $card = $(".credit-card");
  const $terminal = $(".terminal");
  let isDragging = false;
  let cardInserted = false;
  let offset = { x: 0, y: 0 };

  $card.on("mousedown", function (e) {
    isDragging = true;
    const containerOffset = $(".food-to-make-container").offset();
    offset.x = e.clientX - containerOffset.left - $card.position().left;
    offset.y = e.clientY - containerOffset.top - $card.position().top;
    $card.css("position", "absolute"); // Make sure it's movable
  });

  $(document).on("mousemove", function (e) {
    if (!isDragging) return;
    let x = e.clientX - $(".food-to-make-container").offset().left - offset.x;
    let y = e.clientY - $(".food-to-make-container").offset().top - offset.y;
    $card.css({ left: x + "px", top: y + "px" });

    // Collision detection
    const cardOffset = $card.offset();
    const termOffset = $terminal.offset();

    const cardLeft = cardOffset.left;
    const cardTop = cardOffset.top;
    const cardRight = cardLeft + $card.outerWidth();
    const cardBottom = cardTop + $card.outerHeight();

    const termLeft = termOffset.left;
    const termTop = termOffset.top;
    const termRight = termLeft + $terminal.outerWidth();
    const termBottom = termTop + $terminal.outerHeight();

    const isTouching =
      cardLeft >= termLeft &&
      cardRight <= termRight &&
      cardTop >= termTop &&
      cardBottom <= termBottom;

    if (isTouching && !cardInserted) {
      console.log("Card touched terminal!");
      cardInserted = true;
      $terminal.find("img").attr("src", "/media/terminal_green.png");
      $("#popup .heading").text("Done!");
      setTimeout(() => location.reload(), 2000);
    }
  });

  $(document).on("mouseup", function () {
    isDragging = false;
  });
};

const pizzaMiniGame = () => {
  $(".food-to-make-container").html("");
  $("#minigame-container").addClass("pizza-minigame");
  $("#popup .heading").text("Design your own pizza!");

  $("#minigame-container").html(`
    <div class="pizza">
    <img src="/media/full-pizza.png" alt="pizza" />
    </div>
    <div class="toping">
    <img src="/media/tomato.png" alt="tomato" />
    </div>
    <div class="toping">
    <img src="/media/pepperoni.png" alt="peperoni" />
    </div>
    <div class="toping">
    <img src="/media/cheese.png" alt="cheese" />
    </div>
    <div class="toping">
    <img src="/media/mushroom.png" alt="mushrooms" />
    </div>
    <div class="toping">
    <img src="/media/onion.png" alt="onion" />
    </div>
    <div class="button-container">
    <button id="pizza-btn">Bake!</button>
    </div>`);
  draggableUpdate();
  const $topings = $(".toping");
  let $DraggingCard = "";
  let offset = { x: 0, y: 0 };

  $topings.on("mousedown", function (e) {
    $DraggingCard = $(this);
    const containerOffset = $("#minigame-container").offset();
    offset.x = e.clientX - containerOffset.left - $(this).position().left;
    offset.y = e.clientY - containerOffset.top - $(this).position().top;
    $(this).css("position", "absolute"); // Make sure it's movable
  });

  $(document).on("mousemove", function (e) {
    if (!$DraggingCard) return;
    let x = e.clientX - $(".food-to-make-container").offset().left - offset.x;
    let y = e.clientY - $(".food-to-make-container").offset().top - offset.y;
    $DraggingCard.css({ left: x + "px", top: y + "px" });
  });

  $(document).on("mouseup", function () {
    $DraggingCard = "";
  });
  $(document).on("click", "#pizza-btn", function () {
    $(this).text("Done!");
    $("#popup .heading").text("Done!");
    setTimeout(() => location.reload(), 2000);
  });
};

const twisterMiniGame = () => {
  $(".food-to-make-container").html("");
  $("#minigame-container").addClass("twister-minigame");
  $("#popup .heading").text("Suck the twister!");

  $("#minigame-container").html(`
    <div class="head">
    <img src="/media/head.png" alt="head" />
    </div>
    <div class="twister img-container">
    <img src="/media/twister.png" alt="twister">
    </div>
    `);
  draggableUpdate();
  const $head = $(".head");
  const $twister = $(".twister");
  let isDragging = false;
  let touchCount = 0;
  let isTouchingNow = false;
  let offset = { x: 0, y: 0 };

  $head.on("mousedown", function (e) {
    isDragging = true;
    const containerOffset = $("#minigame-container").offset();
    offset.x = e.clientX - containerOffset.left - $head.position().left;
    offset.y = e.clientY - containerOffset.top - $head.position().top;
    $head.css("position", "absolute"); // Make sure it's movable
  });

  $(document).on("mousemove", function (e) {
    if (!isDragging) return;
    let x = e.clientX - $("#minigame-container").offset().left - offset.x;
    let y = e.clientY - $("#minigame-container").offset().top - offset.y;
    $head.css({ left: x + "px", top: y + "px" });

    // Collision detection
    const headOffset = $head.offset();
    const twisterOffset = $twister.offset();

    const headRect = $head[0].getBoundingClientRect();
    const twisterRect = $twister[0].getBoundingClientRect();

    const isTouching =
      headRect.left < twisterRect.right &&
      headRect.right > twisterRect.left &&
      headRect.top < twisterRect.bottom &&
      headRect.bottom > twisterRect.top;

    if (isTouching && !isTouchingNow) {
      // Collision just started
      isTouchingNow = true;
      console.log("Touch start");
    }

    if (!isTouching && isTouchingNow) {
      // Collision just ended
      isTouchingNow = false;
      touchCount++;
      console.log(`Touch cycle ${touchCount}/3`);

      if (touchCount === 3) {
        console.log("Success!");
        $("#popup .heading").text("Done, twister came!");
        setTimeout(() => location.reload(), 2000);
      }
    }
  });

  $(document).on("mouseup", function () {
    isDragging = false;
  });
};

const soupMiniGame = () => {
  $(".food-to-make-container").html("");
  $("#minigame-container").addClass("soup-minigame");
  $("#popup .heading").text("Stir the soup!");

  $("#minigame-container").html(`
    <div class="spoon img-container">
    <img src="/media/spoon.png" alt="spoon" />
    </div>
    <div class="soup img-container">
    <img src="/media/big-soup.png" alt="big-soup">
    </div>
    `);
  draggableUpdate();
  const $spoon = $(".spoon");
  const $soup = $(".soup");
  let isDragging = false;
  let touchDistance = 0;
  let lastRect = { x: 0, y: 0 };
  let offset = { x: 0, y: 0 };

  $spoon.on("mousedown", function (e) {
    isDragging = true;
    const containerOffset = $("#minigame-container").offset();
    offset.x = e.clientX - containerOffset.left - $spoon.position().left;
    offset.y = e.clientY - containerOffset.top - $spoon.position().top;
    $spoon.css("position", "absolute"); // Make sure it's movable
  });

  $(document).on("mousemove", function (e) {
    if (!isDragging) return;
    let x = e.clientX - $("#minigame-container").offset().left - offset.x;
    let y = e.clientY - $("#minigame-container").offset().top - offset.y;
    $spoon.css({ left: x + "px", top: y + "px" });

    // Collision detection
    const spoonOffset = $spoon.offset();
    const soupOffset = $soup.offset();

    const spoonRect = $spoon[0].getBoundingClientRect();
    const soupRect = $soup[0].getBoundingClientRect();

    const isTouching =
      spoonRect.left < soupRect.right &&
      spoonRect.right > soupRect.left &&
      spoonRect.top < soupRect.bottom &&
      spoonRect.bottom > soupRect.top;

    if (isTouching) {
      // Collision just started
      const differenceX = Math.abs(e.clientX - lastRect.x);
      const differenceY = Math.abs(e.clientY - lastRect.y);
      const difference = differenceX + differenceY;
      if (difference !== 0 || difference >= 0) {
        lastRect.x = e.clientX;
        lastRect.y = e.clientY;
        touchDistance = touchDistance + difference;
        console.log("Touch Distance: ", touchDistance / window.screen.width);
      }
      let tchDstToScreenWidth = touchDistance / window.screen.width;
      if (tchDstToScreenWidth >= 1) {
        $(".heading").text("Done!");
        setTimeout(() => location.reload(), 2000);
      }
    }
  });

  $(document).on("mouseup", function () {
    isDragging = false;
  });
};

const pastaMiniGame = () => {
  $(".food-to-make-container").html("");
  $("#minigame-container").addClass("pasta-minigame");
  $("#popup .heading").text("Set timer to 9 minutes!");

  $("#minigame-container").html(`
    <div class="timer-display">
    <span class="clock">0</span>
    <span class="shadow-clock">000</span>
    </div>
    <div class="change-btns-container">
    <div class="button-container">
    <button id="plus-btn">+</button>
    </div>
    <div class="button-container">
    <button id="minus-btn">-</button>
    </div>
    </div>
    <div class="button-container">
    <button id="set-btn">Start</button>
    </div>
    `);
  draggableUpdate();
  let minutes = 0;
  $(document).on("click", "#plus-btn", () => {
    minutes++;
    $(".timer-display .clock").text(minutes);
  });
  $(document).on("click", "#minus-btn", () => {
    minutes = minutes - 1;
    if (minutes <= 0) {
      minutes = 0;
    }
    $(".timer-display .clock").text(minutes);
  });
  $(document).on("click", "#set-btn", () => {
    if (minutes === 9) {
      $("#popup .heading").text("Done!");
      setTimeout(() => location.reload(), 2000);
    } else {
      $("#popup .heading").text("Wrong!");
      $("#popup .clock").addClass("alert");
      setTimeout(() => {
        $("#popup .heading").text("Set timer to 9 minutes!");
        $("#popup .clock").removeClass("alert");
      }, 2000);
    }
  });
};
