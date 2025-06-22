// Get compliment from server
let currectCompliment;
const loadContent = () => {
  $.get("/api/compliment")
    .done((data) => {
      currectCompliment = data.compliment;

      if (data.isLoggedIn) {
        $("#popup-overlay, #popup").fadeIn(200);
        return;
      }

      $.get("/api/compliment/reaction", {
        complimentId: currectCompliment._id,
      }).done((data) => {
        if (!data.success) {
          return console.error(data);
        }
        $(`#${data.reaction}`).addClass("active");
      });

      if (!data.success) {
        $("#compliment").text(`ERROR: ${data.error}`);
        return;
      }

      if (data.alreadySeen) {
        return $("#compliment").text(data.compliment.text).addClass("text");
      }

      // handle new one
      $("#compliment").text("Click to reveal todays...").addClass("reveal");
      $(".card").addClass("reveal");

      $("#compliment").one("click", () => {
        $(".card").removeClass("reveal").addClass("reveal-animate");
        setTimeout(() => {
          $("#compliment")
            .removeClass("reveal")
            .addClass("text")
            .text(data.compliment.text);
        }, 1000);
      });
    })
    .fail((xhr) => {
      if (!xhr.responseJSON.isLoggedIn) {
        console.log("You are not logged in.");
        $("#popup-overlay, #popup").fadeIn(200);
        return;
      }
      $("#compliment").text("Error, sorry");
    });
};
loadContent();
// Open write compliment section
$("#write-comp-heading").click(() => {
  if ($(".write-compliment-container").hasClass("visible")) {
    $("#write-comp-heading i").removeClass("rotate");
    $(".write-compliment-container").removeClass("visible");
    return;
  }
  $("#write-comp-heading i").addClass("rotate");
  $(".write-compliment-container").addClass("visible");
});

$("#compliment-form").submit(function (e) {
  const handleSuccess = () => {
    $("#submit-btn").addClass("success").attr("value", "Done!");
  };

  const handleFail = (error) => {
    $("#error-text").addClass("error").text(error);
    $("#submit-btn").addClass("error").attr("value", "Failed!");
  };

  e.preventDefault();

  $("#error-text").removeClass("error");
  $("#submit-btn")
    .attr("value", "Loading...")
    .removeClass("error")
    .removeClass("success");

  const formData = $(this).serialize();

  $.post("/api/compliment", formData)
    .done((response) => {
      if (response.error) {
        if (response.hasAlreadyPosted) {
          $("#error-text").text("You already posted a compliment today.");
        }
        return handleFail();
      }
      if (response.success) {
        handleSuccess();
      }
    })
    .fail((error) => {
      handleFail(error);
    });
});

$(".reaction-btn").click(function () {
  const formData = `complimentId=${currectCompliment._id}&reaction=${$(
    this
  ).attr("id")}`;

  if ($(this).hasClass("active")) {
    $(this).removeClass("active");
    // remove reaction from server
    return $.ajax({
      url: "/api/compliment/reaction",
      method: "DELETE",
      contentType: "application/x-www-form-urlencoded",
      data: formData,
    })
      .done((data) => {
        console.log("reaction removed successfully");
      })
      .fail((err) => {
        console.error(err);
        $(this).addClass("active");
      });
  }

  $(".reaction-btn").removeClass("active");
  $(this).addClass("active");
  // add reaction to server
  $.post("/api/compliment/reaction", formData)
    .done((data) => {
      console.log(data);
    })
    .fail((err) => {
      $(this).removeClass("active");
    });
});

$(".reaction-btn").mouseenter(function () {
  if ($(".reaction-btn.active").length > 0) {
    return;
  }
  $(this).addClass("hover");
});

$(".reaction-btn").mouseleave(function () {
  $(this).removeClass("hover");
});
