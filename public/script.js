const loadContent = async () => {
  $.get("/api/home/current-user")
    .done((data) => {
      if (data.isLoggedIn) {
        $("#popup-overlay, #popup").fadeIn(200);
        return;
      }
      if (data.error) {
        console.error("Error loading virtual home:", data.error);
        return;
      }
      console.log(data);
      const user = data.user;
      if (user.name === "Vojtík") {
        $(".character-container img").attr(
          "src",
          "/media/vojtik_character.png"
        );
      } else if (user.name === "Hanča") {
        $(".character-container img").attr(
          "src",
          "/media/hanicka_character.png"
        );
      }
      $("#welcome-text").text(`Welcome, ${user.name}!`);
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
      if (!xhr.responseJSON.isLoggedIn) {
        console.log("You are not logged in.");
        $("#popup-overlay, #popup").fadeIn(200);
        return;
      }
      $("body").text("Error, sorry");
    });

  // Load compliments
  $.get("/api/user").done((data) => {
    if (data.error) {
      console.error("Error loading user data:", data.error);
      return;
    }
    const user = data.user;
    const lastCheckedComplimentDate = new Date(
      user.lastCheckedCompliment
    ).getDate();
    const currentDate = new Date().getDate();
    // IMPORTANT CHANGE TO !==
    if (lastCheckedComplimentDate !== currentDate) {
      $(".compliment-alert").show();
      $(".compliment-text").text("You have a new compliment!");
      $(".compliment-btn").show();
      return;
    }
  });
  // Runs before data loaded, shows if new compliment
  $(".compliment-alert").hide();
  $("compliment-btn").hide();
};
loadContent();

$(".expand-heading").click(function () {
  $(this).find("i").toggleClass("down");
  $(".expand-content").slideToggle(200);
});

$(".compliment-alert").click(() => {
  window.location.href = "/compliments";
});

$(".character-container").click(() => {
  window.location.href = "/virtual-home";
});

//Notifications
if (localStorage.getItem("notificationPermission")) {
  console.log("Notification permission already granted");
  $(".notification-container").hide();
}

$("#notification-btn").click(() => {
  console.log("Notification button clicked, ask for permission");
  //If granted, localStorage set
  localStorage.setItem("notificationPermission", true);
});

//Menu interactions
$(".menu-container div").on("mouseenter", function () {
  const color = $(this).attr("color");
  $(this).css("color", color);
  $(this).find("i").css("color", color);
});

$(".menu-container div").on("mouseleave", function () {
  $(this).css("color", "white");
  $(this).find("i").css("color", "white");
});

$(".menu-container div").click(function () {
  const href = $(this).attr("href");
  if (href === "/logout") {
    // Handle logout
    console.log("Logging out...");
    $.get("/logout").done(() => {
      console.log("Logged out successfully.");
      window.location.href = "/";
    });
    return;
  }
  if (href) {
    window.location.href = href;
  } else {
    console.warn("No href attribute found for this menu item.");
  }
});
