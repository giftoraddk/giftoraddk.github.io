import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';

const getOptions = ({type = 'default', dateMin = null, dateMax = null}) => {
  const opt = {
    type,
    inputMode: true,
    positionToInput: 'auto',
    themeAttrDetect: 'html[data-theme]',
    dateMin: dateMin || '1970-01-01',
    dateMax: dateMax || '2470-12-31'
  }

  switch (type) {
    case 'multiple':
      return {
        ...opt,
        displayMonthsCount: 2,
        monthsToSwitch: 2,
        displayDatesOutside: false,
        disableDatesPast: true,
        enableEdgeDatesOnly: true,
        selectionDatesMode: 'multiple-ranged',
        onChangeToInput(self) {
          if (!self.context.inputElement) return;
          if (self.context.selectedDates && self.context.selectedDates.length > 0) {
            // multiple thì join lại cho đẹp
            self.context.inputElement.value = self.context.selectedDates.join(', ');
            self.hide();
          } else {
            self.context.inputElement.value = '';
          }
        },
      };
    case 'month':
      return {
        ...opt,
        onClickMonth(self) {
          if (!self.context.inputElement) return;
          self.context.inputElement.value = self.context.selectedMonth || '';
          self.hide();
        },
      };
    case 'year':
      return {
        ...opt,
        onClickYear(self) {
          if (!self.context.inputElement) return;
          self.context.inputElement.value = self.context.selectedYear || '';
          self.hide();
        },
      };
    default:
      return {
        ...opt,
        type: 'default',
        selectionTimeMode: type === 'datetime' ? 24 : null,
        onChangeToInput(self, event) {
          if (!self.context.inputElement) return;
          if (self.context.selectedDates && self.context.selectedDates[0]) {
            // If there is a selected time, append it to the date
            let value = self.context.selectedDates[0];
            if (self.context.selectedTime) {
              value += ', ' + self.context.selectedTime;
            }
            self.context.inputElement.value = value;
            // Hide calendar after picking a date
            if(event.type === 'click') self.hide();
          } else {
            self.context.inputElement.value = '';
          }
        },
      };
  }
};

const initCalendar = () => {
  const calendarElements = document.querySelectorAll('[data-calendar]');
  calendarElements.forEach((element) => {
    // Lấy type từ data-calendar, default nếu không có
    const type = element.getAttribute('data-calendar') || 'default';
    const dateMin = element.getAttribute('data-date-min') || null;
    const dateMax = element.getAttribute('data-date-max') || null;
    const calendar = new Calendar(element, getOptions({type, dateMin, dateMax}));
    calendar.init();
  }); 
};

document.addEventListener('astro:page-load', function () {
	// Khởi tạo
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			initCalendar();
		});
	} else {
		initCalendar();
	}
});