let kidId;

const loadContent = () => {
  $.get("/api/home/current-user")
    .done((data) => {
      console.log(data);
      const user = data.user;
      $(".character-heading").text(user.name + ":");
      if (user.isSleeping) {
        $(".character-heading").text("Sleeping...");
        $(".character-container img").attr("src", "/media/sleeping.png");
        $(".sleeping-hide").hide();
        $(".sleeping-show").show();
      } else {
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
      console.error(xhr.responseJSON);
    });
};

loadContent();

const handlePopup = (heading, description, imgUrl, isPregnant) => {
  $("#popup-overlay, #popup").fadeIn(200);

  $("#popup img").attr("src", `/media/${imgUrl}.png`);
  $("#popup .desc").text(description);
  $("#popup .heading").text(heading);
  $("#popup form").hide();

  if (isPregnant) {
    $("#popup .question").text("Jméno nového dítěte?");
    $("#popup form").show();
  }
};

$(".suggestion").click(function () {
  const id = $(this).attr("id");

  if (id === "love") {
    $.post("/api/home/activity/love").done((data) => {
      console.log(data);
      if (data.error) {
        console.error(data);
      }
      handlePopup(
        "Vojtík ti dal backshoty!",
        "Nic lepšího než pořádné backshotíky, že to slyší i máma pod oknem!",
        "hot_face",
        false
      );

      if (data.isNoBoner) {
        handlePopup(
          "Oh noooo, Vojtik nemá bonera.",
          "Bohužel, dneska už na něho bylo akce až až...",
          "hot_face",
          false
        );
      }
      if (data.isPregnant) {
        kidId = data.newKidId;
        handlePopup(
          "Fuck, jsi těhotná!",
          "Ajajáájj, tak máte dítě no. Nudný život rodiče začíná.",
          "kid1",
          true
        );
      }
    });
  }

  $.post(`/api/home/send/${id}`).done((data) => {
    console.log(data);
    if (data.error) {
      return $(this).text("x");
    }

    let imageUrl;
    let headingText1;
    let descriptionText1;
    let headingText2;
    let descriptionText2;
    let headingText3;
    let descriptionText3;
    let headingText4;
    let descriptionText4;

    let isPregnant;

    switch (id) {
      case "cuddle":
        imageUrl = "cuddle";
        headingText1 = "S Vojtíkem jste si dali powernapik";
        descriptionText1 =
          "Hezky obejmutí spinkali jste jako dvě malé kočičky... Cutiies";

        headingText2 = "Disney a cuddles";
        descriptionText2 =
          "Kukli jste se na hezkou Disneovku a s čajíčkem chillovali...";

        headingText3 = "Naked šimrání";
        descriptionText3 =
          "Nic lepšího než když jste se oba vyvalili nazí na postel a jen se hladili ve vláskách a šimrali se.";

        headingText4 = "To lechtáá!";
        descriptionText4 =
          "Klasicky tě Vojtíšek otravoval svým nechtáním a tys mu to zase oplácela tím, žes ho dělala horny...";
        break;
      case "kiss":
        imageUrl = "kissing";
        headingText1 = "Vykousli jste se";
        descriptionText1 =
          "Bohužel zrovna přímo před důchodkyní, která na vás nadávala";

        headingText2 = "Forehead kiss";
        descriptionText2 =
          "Vojtíšek ti dal milion pusinek na čelo a řekl ti, že tě nechce ztratit nikdy!";

        headingText3 = "1 kiss = 2 mlems";
        descriptionText3 =
          "Hráli jste si na kočičky a dali si mlems a kisses a bylo to strašně cuute";

        headingText4 = "Cucáky pořádný!";
        descriptionText4 =
          "Dala si Vojtíškovi milion cucáků a jeho mamča zase nadávala...";
        break;
      case "notify":
        imageUrl = "wave";
        headingText1 = "Už si mě všimni!";
        descriptionText1 = "Mávala si na Vojťáše ať si tě konečně všímá...";

        headingText2 = headingText1;
        headingText3 = headingText1;
        headingText4 = headingText1;
        descriptionText2 = descriptionText1;
        descriptionText3 = descriptionText1;
        descriptionText4 = descriptionText1;
    }
    const random = Math.random();
    if (random < 0.25) {
      return handlePopup(headingText1, descriptionText1, imageUrl, isPregnant);
    }
    if (random < 0.5) {
      return handlePopup(headingText2, descriptionText2, imageUrl, isPregnant);
    }
    if (random < 0.75) {
      return handlePopup(headingText3, descriptionText3, imageUrl, isPregnant);
    } else {
      return handlePopup(headingText4, descriptionText4, imageUrl, isPregnant);
    }
  });
});

$("#popup #exit").click(() => {
  console.log("closing popup");
  $("#popup-overlay, #popup").fadeOut(200);
});

$("#message").on("keydown", function (e) {
  if (e.key === "Enter") {
    //Submit message to backend
    $.post("/api/home/send/message", { message: e.target.value }).done(
      (data) => {
        console.log(data);
        $(this).val("");
        const placeholderFromBefore = $(this).attr("placeholder");
        $(this).attr("placeholder", "Successful!");
        setTimeout(() => {
          $(this).attr("placeholder", placeholderFromBefore);
        }, 2000);
      }
    );
  }
});

$("#new-kid-form").submit(function (e) {
  e.preventDefault();
  // Convert form data to object, add/override id and type, then send
  const formArray = $(this).serializeArray();
  const formDataObj = {};
  formArray.forEach((item) => {
    formDataObj[item.name] = item.value;
  });
  formDataObj.id = kidId;
  formDataObj.type = "user";
  $.post("/api/home/change/rename", formDataObj)
    .done((data) => {
      console.log(data);
      if (!data.success) {
        return $("#popup").text("ERROR, sorry somethings wrong");
      }
      $("#popup-overlay, #popup").fadeOut(200);
    })
    .fail((xhr) => console.log(xhr.responseJSON));
});

$(".menu-container .tile").click(function () {
  const href = $(this).attr("id");
  if (href) {
    window.location.href = "/virtual-home/" + href;
  } else {
    console.warn("No href attribute found for this menu item.");
  }
});

$(" .activity-container .activity").click(function () {
  const id = $(this).attr("id");
  if (id === "sleep") {
    return $.post("/api/home/activity/sleep", { endSleep: "" })
      .done((data) => {
        console.log(data);
        if (data.isSleeping) {
          location.reload();
        }
      })
      .fail((xhr) => console.log(xhr.responseJSON));
  }
  if (id === "tv") {
    $.post("/api/home/activity/tv").done((data) => {
      console.log(data);
      if (data.success) {
        handlePopup(
          "You watch a serial",
          "You watch the tv with your dog and rested a bit.",
          "tv",
          false
        );
        loadContent();
      }
    });
    return;
  }
  if (id === "eat") {
    location.href = "/virtual-home/food";
  }
});

$(".menu-container #end-sleep").click(() => {
  $.post("/api/home/activity/sleep", { endSleep: true }).done((data) => {
    console.log(data);
    if (!data.isSleeping) {
      location.reload();
    }
  });
});
