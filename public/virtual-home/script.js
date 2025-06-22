const loadContent = () => {
  $.get("/api/home/current-user")
    .done((data) => {
      console.log(data);
      const user = data.user;
      $(".character-heading").text(user.name + ":");
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
      console.error(xhr.responseJSON);
    });
};

loadContent();

const handleLove = () => {
  $.post("/api/home/activity/").done((data) => {
    console.log(data);
  });
};

$(".suggestion").click(function () {
  const id = $(this).attr("id");
  if (id === "love") {
    //Handle love seperatedly
    handleLove();
  }
  $.post(`/api/home/send/${id}`).done((data) => {
    console.log(data);
    if (data.error) {
      return $(this).text("x");
    }
    const textFromBefore = $(this).text();
    $(this).html('<i class="fa-solid fa-check"></i>');
    setTimeout(() => {
      $(this).text(textFromBefore);
    }, 2000);
  });
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
